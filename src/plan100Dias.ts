// SPDX-FileCopyrightText: Copyright EPA Bienestar
// SPDX-License-Identifier: Apache-2.0
//
// Constantes y helpers FHIR del "Plan Bienestar 100 Días".
//
// El plan se modela como:
//   PlanDefinition (canonical, immutable, versionado) + ActivityDefinitions + Goal templates
//   ↓
//   CarePlan por paciente (instantiatesCanonical = PlanDefinition.url)
//   ↓
//   Goals por paciente (CarePlan.goal) + Tasks/ServiceRequests por actividad
//
// Se siembra el Project Mujer con `data/core/plan-bienestar-100-dias.json` (un
// transaction Bundle). El bundle se carga via batch desde la UI de Medplum o
// con un Bot. Una vez en el backend, el dashboard consulta:
//
//   - Pacientes inscriptos: CarePlan?instantiates-canonical=<url>&status=active
//   - Goals activos:        Goal?lifecycle-status=active&...joint patient
//   - Próximas Activities:  Task?based-on=CarePlan/...
//
// El identifier (`url`) se mantiene estable para que el filtro funcione sin
// hardcodear el id interno del recurso PlanDefinition.

export const PLAN_100_CANONICAL = 'https://epa-bienestar.com.ar/PlanDefinition/plan-bienestar-100-dias';
export const PLAN_100_TITLE = 'Plan Bienestar 100 Días';

export const PLAN_100_ACTIVITY_CANONICALS = [
  'https://epa-bienestar.com.ar/ActivityDefinition/educacion-nutricional',
  'https://epa-bienestar.com.ar/ActivityDefinition/actividad-fisica-semanal',
  'https://epa-bienestar.com.ar/ActivityDefinition/control-ta-semanal',
  'https://epa-bienestar.com.ar/ActivityDefinition/control-peso-semanal',
  'https://epa-bienestar.com.ar/ActivityDefinition/higiene-sueno',
  'https://epa-bienestar.com.ar/ActivityDefinition/salud-emocional',
  'https://epa-bienestar.com.ar/ActivityDefinition/cesacion-tabaquica',
  'https://epa-bienestar.com.ar/ActivityDefinition/lab-control-100d',
];
