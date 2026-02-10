# Mapa de Especialidades — Estudios y Consultas

## Resumen

Score LE8 como input → `bot-specialty-router` analiza → derivación automática por especialidad → genera ServiceRequests con estudios y consultas personalizados.

---

## 1. Cardiología ❤️

**Triggers:** PA < 60 OR Colesterol < 50 OR Score Global < 50

### Consultas
1. Consulta cardiológica de evaluación inicial
2. Control post-estudios con resultados
3. Consulta de seguimiento (30/60/90 días)

### Estudios — Laboratorio
| Estudio | LOINC | Prioridad |
|---------|-------|-----------|
| Perfil lipídico completo | 57698-3 | obligatorio |
| PCR ultrasensible | 30522-7 | obligatorio |
| Troponina T alta sensibilidad | 67151-1 | condicional |
| NT-proBNP | 33762-6 | condicional |
| Lipoproteína (a) | 10835-7 | recomendado |
| Apo B | 1884-6 | recomendado |

### Estudios — Imágenes
| Estudio | Prioridad |
|---------|-----------|
| ECG 12 derivaciones | obligatorio |
| Ecocardiograma Doppler color | obligatorio |
| Eco Doppler vasos de cuello (TSA) | obligatorio |
| Eco Doppler arterial MMII | condicional |

### Estudios — Alta Complejidad
| Estudio | Prioridad |
|---------|-----------|
| Ergometría / PEG | obligatorio |
| Score de Calcio coronario (Angio-TC) | condicional |
| MAPA 24hs | condicional |
| Holter ECG 24hs | condicional |
| RMN cardíaca | especializado |
| SPECT / PCI cardíaco | especializado |
| Coronariografía | especializado |

### Matriz de Decisión
- Score PA<40 + Col<40 → panel completo + alta complejidad
- Score PA<60 → panel básico + ergometría
- Antecedentes familiares CV → agregar Score Ca + Lp(a)

---

## 2. Ginecología 🌸

**Triggers:** Programa Mujer activo OR (mujer AND > 40 años) OR (IMC > 30 + mujer)

### Consultas
1. Consulta ginecológica preventiva
2. Evaluación climatérica / menopausia
3. Control post-estudios ginecológicos
4. Consulta de salud sexual y reproductiva

### Estudios — Laboratorio
| Estudio | LOINC | Prioridad |
|---------|-------|-----------|
| Perfil hormonal (FSH, LH, estradiol) | panel | obligatorio |
| TSH + T4 libre | 3016-3 | obligatorio |
| Vitamina D (25-OH) | 1989-3 | obligatorio |
| Calcio + Fósforo sérico | 17861-6 | recomendado |
| PAP / citología cervical | 10524-7 | obligatorio |
| HPV test | 21440-3 | obligatorio |

### Estudios — Imágenes
| Estudio | Prioridad |
|---------|-----------|
| Ecografía ginecológica transvaginal | obligatorio |
| Mamografía bilateral | obligatorio |
| Ecografía mamaria | condicional |
| Densitometría ósea (DEXA) | recomendado |

### Estudios — Alta Complejidad
| Estudio | Prioridad |
|---------|-----------|
| RMN mamaria | especializado |
| Colposcopía | condicional |
| Biopsia endometrial | especializado |

### Matriz de Decisión
- Mujer >40 + Prog.Mujer → panel hormonal + mamografía + PAP/HPV
- Menopausia → agregar DEXA + Vit D + Ca
- IMC>30 → screening metabólico cruzado con Endocrinología

---

## 3. Endocrinología ⚗️

**Triggers:** Glucemia < 50 OR IMC/Peso < 50 OR Score Global < 45

### Consultas
1. Consulta endocrinológica de evaluación
2. Control metabólico con resultados
3. Seguimiento plan nutricional + metabólico
4. Evaluación tiroidea (si TSH alterada)

### Estudios — Laboratorio
| Estudio | LOINC | Prioridad |
|---------|-------|-----------|
| Glucemia en ayunas | 1558-6 | obligatorio |
| HbA1c | 4548-4 | obligatorio |
| Índice HOMA-IR | pending | obligatorio |
| Insulinemia basal | 20448-7 | obligatorio |
| Perfil tiroideo (TSH, T4L, T3L) | panel | obligatorio |
| Cortisol matutino | 2143-6 | condicional |
| PTOG 75g (si prediabetes) | 1518-0 | condicional |
| Vitamina B12 + Ácido fólico | 2132-9 | recomendado |

### Estudios — Imágenes
| Estudio | Prioridad |
|---------|-----------|
| Ecografía tiroidea | condicional |
| Ecografía abdominal (hígado graso) | recomendado |
| Composición corporal (DEXA body) | recomendado |

### Estudios — Alta Complejidad
| Estudio | Prioridad |
|---------|-----------|
| PAAF tiroidea (si nódulo) | especializado |
| Elastografía hepática (FibroScan) | condicional |
| Calorimetría indirecta | especializado |

### Matriz de Decisión
- Glucemia<50 + IMC<50 → panel metabólico completo + HOMA
- HbA1c>5.7 → PTOG
- TSH alterada → perfil tiroideo + eco
- IMC>35 → agregar cortisol + evaluación NASH

---

## 4. Traumatología 🦴

**Triggers:** Actividad Física < 40 AND (IMC < 40 OR > 50 años)

### Consultas
1. Evaluación músculo-esquelética funcional
2. Consulta por dolor articular / limitación
3. Evaluación pre-actividad física
4. Control de rehabilitación

### Estudios — Laboratorio
| Estudio | LOINC | Prioridad |
|---------|-------|-----------|
| Vitamina D (25-OH) | 1989-3 | obligatorio |
| Calcio iónico | 1994-3 | recomendado |
| Fosfatasa alcalina | 6768-6 | recomendado |
| PCR / VSG (si sospecha inflamatoria) | 30522-7 | condicional |
| Ácido úrico | 3084-1 | condicional |
| Factor reumatoide + Anti-CCP | panel | condicional |

### Estudios — Imágenes
| Estudio | Prioridad |
|---------|-----------|
| Rx columna dorso-lumbar | condicional |
| Rx de rodillas bilateral | condicional |
| Densitometría ósea (DEXA) | recomendado |
| Ecografía articular (hombro/rodilla) | condicional |

### Estudios — Alta Complejidad
| Estudio | Prioridad |
|---------|-----------|
| RMN articular (rodilla/hombro/columna) | especializado |
| Artroscopía diagnóstica | especializado |
| Electromiografía (EMG) | especializado |

### Matriz de Decisión
- Act.Física<40 + Edad>50 → eval funcional + DEXA + Vit D
- IMC>35 → Rx rodillas + columna
- Dolor articular → panel inflamatorio + eco articular
- Pre-ejercicio → eval músculo-esquelética

---

## 5. Neumonología 🫁

**Triggers:** Tabaquismo < 60 OR Sueño < 50 OR Actividad Física < 40

### Consultas
1. Consulta neumonológica de evaluación
2. Evaluación de cesación tabáquica
3. Consulta por trastornos del sueño / SAHOS
4. Control funcional respiratorio post-estudios

### Estudios — Laboratorio
| Estudio | LOINC | Prioridad |
|---------|-------|-----------|
| Hemograma completo | 57021-8 | obligatorio |
| Gasometría arterial (si disnea) | 24336-0 | condicional |
| IgE total (si sospecha alergia) | 19113-0 | condicional |
| Alfa-1 antitripsina | 6770-2 | condicional |

### Estudios — Imágenes
| Estudio | Prioridad |
|---------|-----------|
| Rx de tórax frente y perfil | obligatorio |
| TC de tórax baja dosis (screening tabaco) | condicional |

### Estudios — Alta Complejidad
| Estudio | Prioridad |
|---------|-----------|
| Espirometría con broncodilatador | obligatorio |
| Difusión de CO (DLCO) | condicional |
| Polisomnografía / estudio de sueño | condicional |
| Poligrafía respiratoria domiciliaria | condicional |
| Test de caminata 6 minutos | recomendado |
| TC tórax alta resolución | especializado |

### Matriz de Decisión
- Tabaco<60 + >20 paquetes-año → screening TC tórax + espirometría
- Sueño<50 + IMC>30 → polisomnografía/poligrafía (SAHOS)
- Tabaco activo → programa cesación + eval funcional completa

---

## 6. Otras Especialidades 🏥

**Triggers:** Score Global < 40 OR múltiples dimensiones < 50 OR hallazgos en estudios iniciales

### Consultas (por derivación)
- **Nefrología:** si creatinina elevada / TFGe < 60
- **Neurología:** si cefaleas + HTA / ACV familiar
- **Nutrición:** SIEMPRE (complemento obligatorio del camino LE8)
- **Psicología:** si sueño < 40 / fumador activo / stress
- **Oftalmología:** si diabético / HTA / > 50 años
- **Urología:** hombres > 50 años (PSA + evaluación)
- **Dermatología:** screening de lesiones pigmentadas
- **Odontología:** evaluación periodontal (relación CV)

### Estudios
| Estudio | LOINC | Prioridad |
|---------|-------|-----------|
| Creatinina + TFGe (Nefrología) | 2160-0 | obligatorio |
| Microalbuminuria (Nefrología) | 14957-5 | obligatorio |
| PSA total + libre (Urología, >50) | 2857-1 | condicional |
| Hepatograma completo | 24325-3 | obligatorio |
| Ferritina + hierro sérico | 2276-4 | recomendado |
| Fondo de ojo (Oftalmología) | — | condicional |
| Ecografía renal bilateral | — | condicional |

### Matriz de Decisión
- TFGe<60 → Nefrología obligatoria
- Diabético → Oftalmología + Nefrología
- Score Global<40 → Nutrición + Psicología obligatorias
- Hombre>50 → PSA screening

---

## Estudios Compartidos (Cross-Referral)

Algunos estudios son pedidos por múltiples especialidades. El `bot-crossref-engine` deduplica:

| Estudio | Especialidades que lo piden |
|---------|---------------------------|
| Vitamina D (25-OH) | Gineco + Trauma + Endo |
| DEXA (Densitometría) | Gineco + Trauma |
| TSH / Perfil tiroideo | Gineco + Endo |
| PCR ultrasensible | Cardio + Trauma |
| Ecografía abdominal | Endo + Otras |
| Hemograma completo | Neumo + Otras |

**Regla:** 1 estudio = 1 ServiceRequest, resultado compartido a todas las especialidades que lo necesitan.

---

## Prioridades (ValueSet)

| Código | Display | Descripción |
|--------|---------|-------------|
| `obligatorio` | Obligatorio | Siempre se pide cuando la especialidad está activada |
| `recomendado` | Recomendado | Se sugiere, profesional puede excluir |
| `condicional` | Condicional | Solo si se cumplen condiciones adicionales |
| `especializado` | Especializado | Requiere evaluación previa + autorización explícita |
