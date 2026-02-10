# Catálogo de Recursos FHIR R4

## Recursos por Categoría

### Protocolo (definición)
| Resource | Count | Descripción |
|----------|-------|-------------|
| PlanDefinition | 7 | 1 master + 6 por especialidad |
| ActivityDefinition | ~65 | 1 por estudio/consulta posible |
| Questionnaire | 2 | LE8 assessment + screening complementario |
| ValueSet | 3+ | Especialidades, prioridades, dimensiones LE8 |

### Instancia (por paciente)
| Resource | Count | Descripción |
|----------|-------|-------------|
| QuestionnaireResponse | 1/eval | Respuestas del paciente al LE8 |
| CarePlan | 1/paciente | Plan instanciado con activities por especialidad |
| ServiceRequest | N/paciente | 1 por estudio/consulta — category: laboratory/imaging/procedure |
| Task | N/paciente | Tracking de cada ServiceRequest |
| Appointment | N/paciente | Turnos para consultas y estudios |
| Encounter | N/paciente | Consultas realizadas |
| DiagnosticReport | N/paciente | Resultados de estudios |
| Observation | N/paciente | Valores individuales de resultados |
| Consent | 1/paciente | Consentimiento informado |
| Communication | N/paciente | Notificaciones y preparación |
| Composition | 1/completado | Resumen final del camino |
| Binary | N | PDFs, imágenes, documentos |
| Condition | N | Diagnósticos detectados |

### Actores
| Resource | Count | Descripción |
|----------|-------|-------------|
| Patient | N | Pacientes registrados |
| Practitioner | N | Profesionales de salud |
| PractitionerRole | N | Rol + especialidad + organización |
| Organization | N | Instituciones, sedes, white-label clients |

### Seguridad
| Resource | Count | Descripción |
|----------|-------|-------------|
| AccessPolicy | 4 | patient, practitioner, admin, white-label-admin |
| ProjectMembership | N | Usuario ↔ Project ↔ AccessPolicy |

## Profiles EPA

- `EPA-PlanDef-CaminoEspecialidad` — PlanDefinition con actions condicionales
- `EPA-ActivityDef-Estudio` — ActivityDefinition con prep instructions
- `EPA-CarePlan-MultiSpec` — CarePlan con activities agrupadas por especialidad
- `EPA-SR-EstudioConsulta` — ServiceRequest con category y priority EPA
- `EPA-Encounter-Consulta` — Encounter tipificado por especialidad
- `EPA-QR-LE8` — QuestionnaireResponse con scores 0-100

## Naming Conventions

- PlanDefinition IDs: `pd-cardiology`, `pd-gynecology`, etc.
- ActivityDefinition IDs: `ad-lab-lipid-panel`, `ad-img-ecg`, `ad-hc-ergometry`
- Questionnaire IDs: `q-le8-assessment`
- ValueSet IDs: `vs-specialty-codes`, `vs-study-priority`, `vs-le8-dimensions`
