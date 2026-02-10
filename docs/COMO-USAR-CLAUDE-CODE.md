# Cómo usar este proyecto con Claude Code

## ¿Qué es Claude Code?

Claude Code es un agente de coding que corre en tu terminal. Lee los archivos del proyecto (especialmente CLAUDE.md) y ejecuta tareas de desarrollo de forma autónoma.

## Instalación

```bash
# Requiere Node.js >= 18
npm install -g @anthropic-ai/claude-code

# Verificar instalación
claude --version
```

## Setup Inicial

### 1. Crear el repo y copiar los docs

```bash
# Crear directorio del proyecto
mkdir -p epa-bienestar
cd epa-bienestar

# Copiar todo el contenido de este kit:
# - CLAUDE.md (raíz del proyecto)
# - docs/ (toda la carpeta)
# - Crear estructura vacía de carpetas:
mkdir -p fhir-bundles/{questionnaires,plan-definitions,activity-definitions/{laboratory,imaging,high-complexity},value-sets}
mkdir -p bots/src bots/subscriptions
mkdir -p php-frontend
mkdir -p access-policies
mkdir -p infra

# Inicializar git
git init
git add .
git commit -m "Initial project setup with specs"
```

### 2. Iniciar Claude Code

```bash
cd epa-bienestar
claude
```

Claude Code va a leer automáticamente el `CLAUDE.md` y entender todo el proyecto.

## Prompts por Fase

### FASE 1: FHIR Bundles

```
Estamos en la Fase 1. Lee docs/SPECIALTIES.md y docs/FHIR-RESOURCES.md.
Crea el Questionnaire FHIR R4 para LE8 assessment con 8 items 
(diet, physical-activity, nicotine, sleep, weight-bmi, blood-lipids, 
blood-glucose, blood-pressure). Cada item tipo integer con score 0-100.
Guárdalo en fhir-bundles/questionnaires/le8-assessment.json
```

```
Ahora crea el PlanDefinition para Cardiología basándote en 
docs/SPECIALTIES.md sección 1. Incluye action[] con conditions 
que evalúen los scores LE8. Cada action referencia un ActivityDefinition.
Guárdalo en fhir-bundles/plan-definitions/cardiology.json
```

```
Crea los ActivityDefinitions de laboratorio para Cardiología 
(6 estudios) con sus LOINC codes correctos. Cada uno como 
recurso individual en fhir-bundles/activity-definitions/laboratory/
```

```
Repite lo mismo para las 5 especialidades restantes. Usa las tablas 
de docs/SPECIALTIES.md para los codes LOINC y prioridades.
```

```
Crea el script upload-bundles.ts que lea todos los JSONs de 
fhir-bundles/ y los suba como Transaction Bundles a 
https://api.epa-bienestar.com.ar/fhir/R4 usando @medplum/core SDK.
```

### FASE 2: Bots

```
Estamos en la Fase 2. Lee docs/BOTS-SPEC.md completo.
Implementa bot-specialty-router.ts siguiendo la especificación exacta.
Usa @medplum/core y @medplum/fhirtypes. El handler recibe un 
QuestionnaireResponse y debe crear CarePlan + ServiceRequests.
Guárdalo en bots/src/bot-specialty-router.ts
```

```
Ahora implementa bot-order-activator.ts según la spec.
Maneja las 3 prioridades (obligatorio → auto, condicional → review,
especializado → auth explícita). Crea Communications con instrucciones.
```

```
Implementa bot-result-processor.ts. Debe parsear DiagnosticReports,
comparar contra referenceRange, flagear anormales, y recalcular 
el score LE8 cuando tiene datos suficientes.
```

```
Crea setup-subscriptions.ts que registre todas las Subscriptions
necesarias en Medplum para triggear cada Bot.
```

### FASE 3: PHP Frontend

```
Estamos en la Fase 3. Lee docs/AUTH0-PLAN.md.
Crea un proyecto Laravel con Auth0 PHP SDK integrado.
Implementa login → Auth0 Universal Login → callback → 
token exchange con Medplum /auth/external.
Usa el patrón de doble token (Auth0 + Medplum en session).
```

```
Crea el formulario LE8 de 8 pasos en PHP/Blade.
Cada paso es una dimensión (diet, physical-activity, etc.)
Al completar, POST el QuestionnaireResponse a la API FHIR
usando el Medplum token de la session.
```

```
Crea el dashboard del paciente que muestra:
- Score LE8 actual (gráfico radar)
- Especialidades activadas
- Estudios pendientes y completados (ServiceRequests)
- Próximos turnos (Appointments)
Todo consultando la API FHIR con GET requests.
```

### FASE 4: Auth0

```
Necesito el código de configuración para Auth0:
1. Auth0 Action post-login que inyecte roles y metadata EPA en tokens
2. El código PHP de AuthController con login/callback/logout
3. El código del token exchange Auth0→Medplum
Referencia: docs/AUTH0-PLAN.md
```

### FASE 5: AccessPolicies

```
Crea los AccessPolicies FHIR para Medplum:
1. EPA-Patient-Policy: solo propios Patient, Observation, SR, DR, CarePlan
2. EPA-Practitioner-Policy: read/write SR, DR de pacientes asignados
3. EPA-Admin-Policy: full access
Guárdalos en access-policies/ como JSON.
```

## Tips para trabajar con Claude Code

### Darle contexto incremental
No le pidas todo de una vez. Fase por fase, recurso por recurso.
Claude Code lee los archivos existentes del proyecto para entender el contexto.

### Pedirle que lea antes de escribir
```
Lee docs/SPECIALTIES.md y luego crea los ActivityDefinitions 
de Ginecología.
```

### Pedirle que valide
```
Valida que el PlanDefinition de cardiología sea FHIR R4 válido
y que las references a ActivityDefinitions sean correctas.
```

### Pedirle tests
```
Crea tests unitarios para bot-specialty-router.ts usando
@medplum/mock para simular la API FHIR.
```

### Pedirle que suba a Medplum
```
Ejecuta upload-bundles.ts contra api.epa-bienestar.com.ar
con las credenciales de la variable de entorno MEDPLUM_TOKEN.
```

## Variables de Entorno

Crear `.env` en la raíz:
```
MEDPLUM_BASE_URL=https://api.epa-bienestar.com.ar
MEDPLUM_CLIENT_ID=<tu-client-id>
MEDPLUM_CLIENT_SECRET=<tu-client-secret>
MEDPLUM_PROJECT_ID=<tu-project-id>
AUTH0_DOMAIN=epa-bienestar.auth0.com
AUTH0_CLIENT_ID=<auth0-client-id>
AUTH0_CLIENT_SECRET=<auth0-client-secret>
```

## Orden recomendado de trabajo

```
Fase 1.1: Questionnaire LE8 → subir → verificar en app.epa
Fase 1.2: ValueSets → subir
Fase 1.3: ActivityDefinitions (empezar por Cardiología) → subir
Fase 1.4: PlanDefinitions → subir → verificar references
Fase 2.1: bot-specialty-router → deploy → test con QR manual
Fase 2.2: Subscriptions → crear → verificar trigger
Fase 2.3: Bots secundarios → deploy
Fase 3.1: Laravel + Auth0 → login funcional
Fase 3.2: Formulario LE8 → test end-to-end (form → QR → bot → SRs)
Fase 3.3: Dashboards paciente + profesional
Fase 4: Auth0 setup completo (social login, Google Workspace)
Fase 5: AccessPolicies → test aislamiento
Fase 6: Integración final → pilot
```
