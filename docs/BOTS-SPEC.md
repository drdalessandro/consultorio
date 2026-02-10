# Bots TypeScript — Especificación Técnica

## Resumen

5 Bots principales + 1 de user provisioning. Todos ejecutan como Medplum Bots en AWS Lambda.

**Handler pattern:**
```typescript
import { BotEvent, MedplumClient } from '@medplum/core';

export async function handler(medplum: MedplumClient, event: BotEvent): Promise<any> {
  const resource = event.input; // El recurso que triggeró el Bot
  // ... lógica
}
```

**Deploy:** `medplum bot deploy <bot-name>`

---

## 1. bot-specialty-router (CORE)

**Trigger:** Subscription → `QuestionnaireResponse?questionnaire=Questionnaire/le8-assessment`
**Criterio:** `QuestionnaireResponse` con status = completed

### Input
- `QuestionnaireResponse` con items por cada dimensión LE8:
  - diet (linkId: "diet", score 0-100)
  - physical-activity (linkId: "physical-activity", score 0-100)
  - nicotine (linkId: "nicotine", score 0-100)
  - sleep (linkId: "sleep", score 0-100)
  - weight-bmi (linkId: "weight-bmi", score 0-100)
  - blood-lipids (linkId: "blood-lipids", score 0-100)
  - blood-glucose (linkId: "blood-glucose", score 0-100)
  - blood-pressure (linkId: "blood-pressure", score 0-100)

### Lógica (pseudocódigo)
```
1. Extraer Patient reference del QR
2. GET Patient → obtener age, gender, extensions (programaMujer, etc.)
3. Calcular score global = promedio de 8 dimensiones
4. Evaluar cada especialidad:

   CARDIOLOGY:
     IF blood-pressure < 60 OR blood-lipids < 50 OR globalScore < 50
     THEN activate cardiology pathway

   GYNECOLOGY:
     IF (patient.gender == "female" AND age > 40) OR patient.ext.programaMujer == true
     THEN activate gynecology pathway

   ENDOCRINOLOGY:
     IF blood-glucose < 50 OR weight-bmi < 50 OR globalScore < 45
     THEN activate endocrinology pathway

   TRAUMATOLOGY:
     IF physical-activity < 40 AND (weight-bmi < 40 OR age > 50)
     THEN activate traumatology pathway

   PULMONOLOGY:
     IF nicotine < 60 OR sleep < 50
     THEN activate pulmonology pathway

   OTHER:
     IF globalScore < 40 OR (count of dimensions < 50) >= 3
     THEN activate other specialties

5. Para cada especialidad activada:
   a. GET PlanDefinition/<specialty-id>
   b. Ejecutar PlanDefinition.$apply(patient, encounter)
   c. Resultado: CarePlan con ServiceRequests draft

6. Crear CarePlan master con todas las activities agrupadas por especialidad
7. Crear Communication al paciente: "Se generó tu plan de estudios"
```

### Output
- 1 `CarePlan` (status: draft, activity[] con refs a cada ServiceRequest)
- N `ServiceRequest` (status: draft, category: laboratory|imaging|procedure)
- N `Task` (status: ready, focus → ServiceRequest)
- 1 `Communication` (notificación al paciente)

---

## 2. bot-order-activator

**Trigger:** Subscription → `Task?status=ready` (o cuando profesional cambia SR.status a active)
**Criterio:** Task con focus → ServiceRequest en status draft

### Input
- `Task` con focus reference a ServiceRequest

### Lógica
```
1. GET ServiceRequest del Task.focus
2. GET ActivityDefinition referenciada en SR.instantiatesCanonical
3. Evaluar prioridad:
   IF priority == "obligatorio" → auto-activate (no requiere aprobación)
   IF priority == "condicional" → requiere revisión del profesional
   IF priority == "especializado" → requiere autorización explícita
4. Si auto-activate o profesional aprobó:
   a. PATCH SR.status = active
   b. GET prep instructions de ActivityDefinition.extension[prepInstructions]
   c. Crear Communication al paciente con instrucciones:
      - Lab: "Ayuno 12hs, no fumar, hidratación"
      - Imaging: instrucciones específicas por estudio
      - Alta complejidad: prep especial + consentimiento
   d. Crear Appointment draft (si hay agenda)
5. PATCH Task.status = in-progress
```

### Output
- `ServiceRequest` (status: active)
- `Communication` (instrucciones de preparación)
- `Appointment` (draft, si aplica)
- `Task` (status: in-progress)

---

## 3. bot-result-processor

**Trigger:** Subscription → `DiagnosticReport?status=final`
**Criterio:** DiagnosticReport con status = final

### Input
- `DiagnosticReport` con result[] → references a Observations

### Lógica
```
1. GET Observations[] del DiagnosticReport.result
2. Para cada Observation:
   a. Comparar value contra referenceRange
   b. FLAG:
      - Normal (dentro de rango): interpretation = "N"
      - Borderline (±10% del límite): interpretation = "A"
        → Communication al profesional
      - Crítico (fuera de rango): interpretation = "H" o "L"
        → ALERTA URGENTE al profesional
3. Mapear resultados a dimensiones LE8:
   - Lipidograma → actualizar score Colesterol
   - HbA1c/Glucemia → actualizar score Glucemia
   - Espirometría → complementar score Tabaco
   - DEXA → complementar score actividad física
4. Si tiene suficientes datos, recalcular score global LE8
5. GET CarePlan del paciente
6. PATCH CarePlan: marcar activity correspondiente como completed
7. Buscar ServiceRequest asociado → PATCH status = completed
8. Si hallazgo NUEVO que requiere otra especialidad:
   (ej: TSH alterada en gineco → triggear Endocrinología)
   → Crear nuevo ServiceRequest + agregar a CarePlan
```

### Output
- `Observation[]` (interpretations updated)
- `CarePlan` (activity marked completed)
- `ServiceRequest` (status: completed)
- Posible `Communication` (alerta al profesional)
- Posible nuevos `ServiceRequest` (cross-referral)

---

## 4. bot-crossref-engine

**Trigger:** Subscription → `CarePlan?status=active` (cuando se actualiza un CarePlan)
**Criterio:** CarePlan con al menos 2 especialidades activas

### Input
- `CarePlan` actualizado

### Lógica
```
1. GET todos los ServiceRequests del CarePlan
2. DEDUPLICACIÓN:
   - Agrupar SR por code (LOINC/SNOMED)
   - Si mismo código aparece en >1 especialidad:
     → Mantener 1 SR, cancelar duplicados
     → Agregar extension con especialidades que lo requieren
   - Ejemplo: Vitamina D pedida por Gineco + Trauma → 1 SR
3. CROSS-REFERRAL (cuando se completa un resultado):
   - TSH alterada en Gineco → verificar si Endo está activada
     → Si no → activar Endocrinología (crear nuevos SR)
   - SAHOS detectado en Neumo → verificar Cardiología
   - Creatinina elevada → verificar Nefrología
   - HbA1c elevada → verificar Endocrinología
4. Actualizar CarePlan con cambios
5. Communication al profesional coordinador sobre cross-referrals
```

### Output
- `ServiceRequest[]` (deduplicados o nuevos)
- `CarePlan` (updated o extended)
- `Communication` (al coordinador)

---

## 5. bot-completion-summary

**Trigger:** Subscription → `CarePlan` — cuando TODOS los ServiceRequests están completed
**Criterio:** CarePlan donde todas las activity tienen status completed

### Input
- `CarePlan` con todos los activities completed

### Lógica
```
1. Verificar que todos los SR están completed o cancelled
2. GET todos los DiagnosticReports del paciente en este CarePlan
3. GET todas las Observations resultantes
4. Generar Composition FHIR (tipo: summary):
   section[0]: Score LE8 inicial vs final
   section[1]: Hallazgos por especialidad (normal/anormal/crítico)
   section[2]: Diagnósticos codificados (Conditions creadas)
   section[3]: Plan de seguimiento
5. Generar PDF del resumen (Binary resource via template HTML→PDF)
6. Crear Encounter de cierre
7. Programar follow-up:
   - Score < 50: nueva evaluación LE8 en 90 días
   - Score 50-70: nueva evaluación en 180 días
   - Score > 70: nueva evaluación en 365 días
   → Crear Task con restriction.period
8. PATCH CarePlan.status = completed
9. Communication al paciente con resumen + link a PDF
```

### Output
- `Composition` (resumen clínico)
- `Binary` (PDF)
- `Encounter` (cierre)
- `Task` (follow-up programado)
- `CarePlan` (status: completed)
- `Communication` (resumen al paciente)

---

## 6. bot-user-provisioning

**Trigger:** Subscription → `Patient?_lastUpdated=gt{now-1min}` (nuevo paciente) o via Auth0 Action post-login
**Criterio:** Nuevo usuario que se loguea por primera vez via Auth0

### Input
- Auth0 user profile (via token claims o webhook)

### Lógica
```
1. Recibe datos del nuevo usuario de Auth0:
   - email, name, picture, auth0_sub
2. Verificar si ya existe Patient/Practitioner con ese email
3. Si no existe:
   IF role == "paciente":
     → Crear Patient FHIR con identifier[auth0] = auth0_sub
     → Crear ProjectMembership con AccessPolicy: EPA-Patient-Policy
   IF role == "profesional":
     → Crear Practitioner FHIR
     → Crear PractitionerRole con specialty
     → Crear ProjectMembership con AccessPolicy: EPA-Practitioner-Policy
4. Guardar mapping: auth0_sub ↔ FHIR resource id
```

### Output
- `Patient` o `Practitioner` (nuevo)
- `PractitionerRole` (si profesional)
- ProjectMembership con AccessPolicy asignada

---

## Subscriptions — Setup

Crear en Medplum via script o app.epa-bienestar.com.ar:

```typescript
// setup-subscriptions.ts
const subscriptions = [
  {
    resourceType: 'Subscription',
    status: 'active',
    criteria: 'QuestionnaireResponse?questionnaire=Questionnaire/le8-assessment&status=completed',
    channel: { type: 'rest-hook', endpoint: 'Bot/bot-specialty-router' }
  },
  {
    resourceType: 'Subscription',
    status: 'active',
    criteria: 'Task?status=ready',
    channel: { type: 'rest-hook', endpoint: 'Bot/bot-order-activator' }
  },
  {
    resourceType: 'Subscription',
    status: 'active',
    criteria: 'DiagnosticReport?status=final',
    channel: { type: 'rest-hook', endpoint: 'Bot/bot-result-processor' }
  },
  {
    resourceType: 'Subscription',
    status: 'active',
    criteria: 'CarePlan?status=active',
    channel: { type: 'rest-hook', endpoint: 'Bot/bot-crossref-engine' }
  },
  // bot-completion-summary se triggerea desde bot-result-processor
  // cuando detecta que todos los SR están completed
];
```
