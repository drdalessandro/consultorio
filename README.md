<h1 align="center">Consultorio · EPA Bienestar IA</h1>
<p align="center">Salud cardiovascular de la mujer en cada etapa de la vida — guiada por el estándar FHIR R4/R5/R6.</p>

URL pública: **https://consultorio.epa-bienestar.com.ar**

> El repo histórico se llama `seguimiento` (legado). El producto se llama **Consultorio**.

---

## Qué hace

Consultorio es una herramienta clínica que **optimiza el flujo de trabajo del profesional médico** en todo el ciclo de la consulta, integrada al backend Medplum self-hosted en `api.epa-bienestar.com.ar`. La filosofía es **FHIR-first**: cada feature respeta el recurso canónico (Patient, Encounter, ServiceRequest, CarePlan, Goal, Device, etc.) y reduce las fricciones que el profesional encuentra en la práctica.

Foco inicial: **Programa Mujer** (FemTech cardiovascular). Project ID `79679343-1b6e-47b9-bee7-32929111451d`. Programa Hábitos se suma a continuación.

### Funcionalidades

- **Resumen del consultorio** scoped al Project activo
  - KPIs: pacientes, pedidos pendientes, resultados (7d), próximos turnos, sugerencias IA pendientes
  - Tarjetas por programa (Mujer + Hábitos)
  - **Plan Bienestar 100 Días**: pacientes inscriptas, goals activos / alcanzados, activities pendientes
  - **Etapas de la vida**: distribución de pacientes femeninas por edad (adolescencia → postmenopausia)
  - **Devices monitoreados**: tensiómetros, balanzas, glucómetros, trackers de actividad, con alertas de inactividad
- **Pedidos de estudios complementarios** con catálogo curado LOINC (lab + imágenes), PDF imprimible y carga de resultados
- **Bots IA** (Claude vía Anthropic API) con de-identificación previa: sugerencia de paneles e interpretación de resultados
- **Multi-tenant lógico** por `meta.tag` y `_project`
- **Localización completa** en español (Argentina)

## Stack

- React 19 + Vite + Mantine 8
- Medplum 5 (cliente FHIR, componentes, Bots)
- Claude Sonnet 4.6 vía Anthropic API (desde los Bots)
- Despliegue: build estático servido por Nginx en la misma VPS que el backend

## Estructura

```
src/
  App.tsx                         layout principal y rutas
  config.ts                       lectura de env vars (baseUrl, projectId, clientId, googleClientId)
  programs.ts                     definición de los 6 programas + ACTIVE_PROGRAMS (Mujer/Hábitos)
  projectScope.ts                 helpers para filtrar queries por _project
  lifeStages.ts                   etapas de la vida femenina (cálculo por edad)
  clinicalDevices.ts              perfiles de Tensiómetro, Balanza, Glucómetro, Tracker actividad
  plan100Dias.ts                  canonical URL de PlanDefinition + ActivityDefinitions
  bots/core/
    clinical-ai-suggest.ts        Bot: sugerencia de estudios via Claude
    clinical-ai-interpret.ts      Bot: interpretación de DiagnosticReport
    deidentify.ts                 utilitarios HMAC para anonimizar antes de enviar a Claude
  components/
    EpaLogo.tsx
    orders/                       OrdersPanel, PatientOrders, catálogo, PDF
    programs/                     badges + resumen de programas del paciente
    actions/AiSuggestionsPanel    UI para aceptar/descartar sugerencias IA
  pages/
    DashboardPage.tsx             Resumen del consultorio (Mujer + Hábitos + Plan 100d + etapas + devices)
    EncounterPage / PatientPage   chart clínico
data/
  core/
    order-panels.json             catálogo curado de paneles (LOINC)
    access-policies.json          AccessPolicy ejemplo
    ai-bots.json                  bundle Bots + Subscriptions IA
    plan-bienestar-100-dias.json  PlanDefinition + ActivityDefinitions + Goals (cargar al Project Mujer)
deploy/
  nginx/                          vhost consultorio.epa-bienestar.com.ar
  install.sh, update.sh           scripts de deploy a /opt/consultorio
docs/
  programs.md, ai-bots.md
```

## Configuración

`.env.defaults` (commiteado, valores no secretos):

```
MEDPLUM_BASE_URL=https://api.epa-bienestar.com.ar/
MEDPLUM_PROJECT_ID=79679343-1b6e-47b9-bee7-32929111451d   # Project Mujer
MEDPLUM_PROJECT_LABEL=Programa Mujer
MEDPLUM_CLIENT_ID=188d147c-a397-482e-898e-928fbd445321    # Mujer Default Client
GOOGLE_CLIENT_ID=472653584585-r9q1rl7junfi6nb2s78ajccv5n2aj6ie.apps.googleusercontent.com
```

Cuando crees el "Consultorio Client" con AccessPolicy multi-Project, reemplazá `MEDPLUM_CLIENT_ID` y rebuildeá.

Project Secrets (en `app.epa-bienestar.com.ar` → Project Mujer → Secrets):

| Secret | Para |
|---|---|
| `ANTHROPIC_API_KEY` | Llamadas a Claude API |
| `DEIDENTIFY_HMAC_KEY` | Pseudonimización (`openssl rand -hex 32`) |

## Sembrar el Plan Bienestar 100 Días

```bash
# desde la UI de Medplum admin (app.epa-bienestar.com.ar) → Project Mujer → Batch upload
# subí el archivo data/core/plan-bienestar-100-dias.json
```

Eso crea el `PlanDefinition` (canonical `https://epa-bienestar.com.ar/PlanDefinition/plan-bienestar-100-dias`) + 8 `ActivityDefinitions` + Goal templates alineados a Life's Essential 8.

## Desarrollo local

```bash
npm install
npm run dev      # localhost:3000
```

## Build + deploy a la VPS

```bash
# en local
npm install
npm run build
git add dist/
git commit -m "build: nuevo dist"
git push origin claude/integrate-medplum-backend-zKqdJ

# en la VPS
cd /opt/consultorio
bash deploy/update.sh
```

Detalles en [`deploy/README.md`](./deploy/README.md).

## Tests

```bash
npm test
```

## Licencia

Apache 2.0. Basado en el ejemplo `medplum-chart-demo` de Medplum.
