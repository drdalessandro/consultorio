# EPA Bienestar IA — Proyecto Multi-Especialidad + Auth0

## 🎯 Visión del Proyecto

Plataforma de salud cardiovascular basada en **Life's Essential 8 (LE8)** que, después de evaluar el score del paciente, genera automáticamente un camino de derivación multi-especialidad con estudios y consultas personalizadas.

**Stack:**
- **Frontend:** PHP (Laravel) en `info.epa-bienestar.com.ar`
- **Backend/Lógica Clínica:** TypeScript — Medplum Bots (Lambda)
- **API FHIR R4:** Medplum self-hosted en `api.epa-bienestar.com.ar`
- **Admin:** Medplum App en `app.epa-bienestar.com.ar`
- **Auth:** Auth0 como Identity Hub central (SSO para todos los servicios)
- **Infra:** AWS sa-east-1 (ECS Fargate, RDS PostgreSQL, ElastiCache Redis)

## 📁 Estructura del Proyecto

```
epa-bienestar/
├── CLAUDE.md                          # ← Este archivo
├── docs/
│   ├── ARCHITECTURE.md                # Arquitectura completa del sistema
│   ├── AUTH0-PLAN.md                  # Plan de identidad unificada Auth0
│   ├── SPECIALTIES.md                 # Mapa de especialidades y estudios
│   ├── BOTS-SPEC.md                   # Especificación de Bots TypeScript
│   └── FHIR-RESOURCES.md             # Catálogo de recursos FHIR R4
├── fhir-bundles/                      # FASE 1: Bundles JSON para subir a Medplum
│   ├── questionnaires/
│   │   └── le8-assessment.json        # Questionnaire LE8 (8 dimensiones)
│   ├── plan-definitions/
│   │   ├── master-multi-specialty.json
│   │   ├── cardiology.json
│   │   ├── gynecology.json
│   │   ├── endocrinology.json
│   │   ├── traumatology.json
│   │   ├── pulmonology.json
│   │   └── other-specialties.json
│   ├── activity-definitions/
│   │   ├── laboratory/               # ~30 ActivityDefinitions lab
│   │   ├── imaging/                   # ~15 ActivityDefinitions imaging
│   │   └── high-complexity/           # ~20 ActivityDefinitions alta complejidad
│   ├── value-sets/
│   │   ├── specialty-codes.json
│   │   ├── study-priority.json
│   │   └── le8-dimensions.json
│   └── upload-bundles.ts             # Script para POST bundles a API
├── bots/                              # FASE 2: Medplum Bots TypeScript
│   ├── src/
│   │   ├── bot-specialty-router.ts    # Core: LE8 → derivación multi-especialidad
│   │   ├── bot-order-activator.ts     # Activa ServiceRequests aprobados
│   │   ├── bot-result-processor.ts    # Procesa DiagnosticReports → score update
│   │   ├── bot-crossref-engine.ts     # Deduplicación + cross-referral
│   │   ├── bot-completion-summary.ts  # Resumen final + PDF
│   │   └── bot-user-provisioning.ts   # Auth0 user → Patient/Practitioner
│   ├── subscriptions/
│   │   └── setup-subscriptions.ts     # Crea Subscriptions en Medplum
│   └── package.json
├── php-frontend/                      # FASE 3: Laravel app
│   ├── routes/
│   ├── app/Http/Controllers/
│   │   ├── AuthController.php         # Auth0 login/callback/logout
│   │   ├── Le8Controller.php          # Formulario LE8 → QR FHIR
│   │   ├── PatientDashboard.php       # Dashboard paciente
│   │   └── ProfessionalDashboard.php  # Dashboard profesional
│   ├── app/Services/
│   │   ├── MedplumService.php         # HTTP client para FHIR API
│   │   └── Auth0TokenExchange.php     # Auth0 → Medplum token exchange
│   └── resources/views/
├── access-policies/                   # FASE 5: AccessPolicies FHIR
│   ├── patient-policy.json
│   ├── practitioner-policy.json
│   ├── admin-policy.json
│   └── upload-policies.ts
└── infra/                             # CDK / Docker
    ├── docker-compose.yml             # Dev local
    └── cdk/                           # AWS CDK (repo separado)
```

## 🏗️ Fases de Implementación

### FASE 1: FHIR Bundles (Empezar aquí)
**Objetivo:** Crear todos los recursos FHIR base y subirlos a api.epa-bienestar.com.ar

**Tareas:**
1. Crear `Questionnaire` LE8 con 8 ítems (linkId por dimensión)
2. Crear 7 `PlanDefinition` (1 master + 6 por especialidad) con conditions basadas en scores
3. Crear ~65 `ActivityDefinition` (1 por estudio/consulta) con codes LOINC/SNOMED
4. Crear `ValueSet` para especialidades, prioridades, dimensiones LE8
5. Script TypeScript para POST bundles transaccionales a la API

**Criterios de aceptación:**
- Bundles válidos contra FHIR R4 spec
- ActivityDefinitions con LOINC codes correctos
- PlanDefinitions con `action.condition` evaluables
- Script sube exitosamente a api.epa-bienestar.com.ar

### FASE 2: Bots TypeScript (Core Logic)
**Objetivo:** Implementar toda la lógica clínica en Medplum Bots

**Bot principal — bot-specialty-router:**
- Trigger: Subscription → QuestionnaireResponse.create
- Input: QR con scores de 8 dimensiones LE8
- Lógica: Evalúa umbrales por especialidad (ver docs/SPECIALTIES.md)
- Output: CarePlan + ServiceRequests[] (status: draft)

**Otros Bots:** ver docs/BOTS-SPEC.md

### FASE 3: PHP Frontend (Laravel)
**Objetivo:** Interfaz para pacientes y profesionales en info.epa-bienestar.com.ar

- Auth via Auth0 PHP SDK (OAuth2 PKCE)
- Token exchange: Auth0 id_token → Medplum access_token via /auth/external
- Formulario LE8 (8 pasos) → POST QuestionnaireResponse
- Dashboard paciente: estudios pendientes/completados
- Dashboard profesional: panel de órdenes + activación

### FASE 4: Auth0 Setup
**Objetivo:** Identidad unificada para todo el ecosistema

- Tenant: epa-bienestar.auth0.com
- Applications: PHP (Regular Web), React SPA, WordPress, Mobile
- Connections: Database + Google Social + Google Workspace Enterprise
- Roles: paciente, profesional, admin
- Ver docs/AUTH0-PLAN.md para configuración detallada

### FASE 5: AccessPolicies & Multi-Tenancy
- Patient policy: solo propios recursos
- Practitioner policy: pacientes asignados + write ServiceRequests
- Admin policy: full access
- Compartments por Organization para multi-sede

## 🔧 Endpoints y Servicios

| Servicio | URL | Stack |
|----------|-----|-------|
| FHIR R4 API | https://api.epa-bienestar.com.ar | Medplum (Node.js/Fargate) |
| Admin App | https://app.epa-bienestar.com.ar | Medplum React App |
| Clinical Frontend | https://info.epa-bienestar.com.ar | PHP Laravel |
| Programa Mujer | https://mujer.epa-bienestar.com.ar | React SPA |
| Plataforma Educativa | https://plataforma.epa-bienestar.com.ar | H5P/PHP |
| Auth0 | https://epa-bienestar.auth0.com | Auth0 SaaS |

## 📏 Convenciones

- **FHIR Resources:** prefijo `EPA-` en profiles (EPA-PlanDef-Cardiology)
- **Bots:** prefijo `bot-` en nombres (bot-specialty-router)
- **Bundles:** tipo Transaction para uploads batch
- **Codes:** LOINC para lab, SNOMED CT para procedimientos
- **Idioma:** recursos clínicos en español, código en inglés, comments en español

## 🩺 Especialidades y Umbrales LE8

| Especialidad | Triggers (dimensiones LE8 con score bajo) |
|---|---|
| Cardiología | PA < 60 OR Colesterol < 50 OR Score Global < 50 |
| Ginecología | Programa Mujer activo OR (mujer AND > 40 años) |
| Endocrinología | Glucemia < 50 OR IMC/Peso < 50 |
| Traumatología | Actividad Física < 40 AND (IMC < 40 OR > 50 años) |
| Neumonología | Tabaquismo < 60 OR Sueño < 50 |
| Otras | Score Global < 40 OR hallazgos específicos |

## 🤖 Referencia Medplum

- SDK: `@medplum/core`, `@medplum/fhirtypes`
- Bot handler: `export async function handler(medplum: MedplumClient, event: BotEvent): Promise<any>`
- Subscription: `{ criteria: 'QuestionnaireResponse', channel: { type: 'rest-hook' } }`
- Deploy: `medplum bot deploy <bot-name>`
- Docs: https://www.medplum.com/docs
- Examples: https://github.com/medplum/medplum/tree/main/examples
