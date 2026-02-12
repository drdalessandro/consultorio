const fs = require('fs');
const path = require('path');

const OUTPUT_DIR = __dirname;

function toPascalCase(id) {
  return id
    .replace(/^ad-img-/, '')
    .split('-')
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join('');
}

function buildActivityDefinition(def) {
  const pascalName = toPascalCase(def.id);
  return {
    resourceType: "ActivityDefinition",
    id: def.id,
    meta: {
      profile: [
        "https://epa-bienestar.com.ar/fhir/StructureDefinition/EPA-ActivityDef-Imaging"
      ]
    },
    url: "https://epa-bienestar.com.ar/fhir/ActivityDefinition/" + def.id,
    version: "1.0.0",
    name: pascalName,
    title: def.title,
    status: "active",
    experimental: false,
    date: "2025-01-01",
    publisher: "EPA Bienestar",
    description: def.description,
    purpose: def.purpose,
    kind: "ServiceRequest",
    intent: "order",
    priority: "routine",
    code: {
      coding: [
        {
          system: "http://snomed.info/sct",
          code: def.snomedCode,
          display: def.snomedDisplay
        }
      ],
      text: def.title
    },
    subjectCodeableConcept: {
      coding: [
        {
          system: "http://hl7.org/fhir/resource-types",
          code: "Patient"
        }
      ]
    },
    useContext: [
      {
        code: {
          system: "http://terminology.hl7.org/CodeSystem/usage-context-type",
          code: "focus"
        },
        valueCodeableConcept: {
          coding: [
            {
              system: "http://snomed.info/sct",
              code: def.specialtySnomedCode,
              display: def.specialtyDisplay
            }
          ]
        }
      }
    ],
    extension: [
      {
        url: "https://epa-bienestar.com.ar/fhir/StructureDefinition/study-priority",
        valueCode: def.priority
      },
      {
        url: "https://epa-bienestar.com.ar/fhir/StructureDefinition/specialty-reference",
        valueCode: def.specialty
      },
      {
        url: "https://epa-bienestar.com.ar/fhir/StructureDefinition/prep-instructions",
        valueString: def.prepInstructions
      }
    ]
  };
}

const definitions = [
  // CARDIOLOGY (4)
  {
    id: "ad-img-ecg-12lead",
    title: "ECG 12 derivaciones",
    description: "Electrocardiograma estándar de 12 derivaciones para evaluación del ritmo cardíaco, conducción eléctrica y detección de isquemia o hipertrofia.",
    purpose: "Screening cardiovascular básico dentro del programa Life's Essential 8 de EPA Bienestar.",
    snomedCode: "164847006",
    snomedDisplay: "Standard 12-lead electrocardiogram",
    specialty: "cardiology",
    specialtySnomedCode: "394579002",
    specialtyDisplay: "Cardiology",
    priority: "obligatorio",
    prepInstructions: "No requiere preparación especial. Evitar ejercicio intenso previo. Retirar objetos metálicos del tórax."
  },
  {
    id: "ad-img-echo-doppler",
    title: "Ecocardiograma Doppler color",
    description: "Ecocardiograma transtorácico con Doppler color para evaluación de estructura y función cardíaca, incluyendo fracción de eyección, valvulopatías y dimensiones cavitarias.",
    purpose: "Evaluación funcional cardíaca en pacientes con score cardiovascular bajo en LE8.",
    snomedCode: "40701008",
    snomedDisplay: "Echocardiography",
    specialty: "cardiology",
    specialtySnomedCode: "394579002",
    specialtyDisplay: "Cardiology",
    priority: "obligatorio",
    prepInstructions: "No requiere preparación especial. Estudio no invasivo, duración aproximada 30 minutos."
  },
  {
    id: "ad-img-echo-tsa",
    title: "Eco Doppler vasos de cuello (TSA)",
    description: "Ecografía Doppler de troncos supraaórticos para evaluación de arterias carótidas y vertebrales, detección de placas ateromatosas y estenosis carotídea.",
    purpose: "Evaluación de enfermedad aterosclerótica carotídea en pacientes con factores de riesgo cardiovascular.",
    snomedCode: "709020003",
    snomedDisplay: "Doppler ultrasonography of carotid arteries",
    specialty: "cardiology",
    specialtySnomedCode: "394579002",
    specialtyDisplay: "Cardiology",
    priority: "obligatorio",
    prepInstructions: "No requiere preparación especial. Retirar collares y accesorios del cuello."
  },
  {
    id: "ad-img-echo-mmii",
    title: "Eco Doppler arterial MMII",
    description: "Ecografía Doppler arterial de miembros inferiores para evaluación de enfermedad arterial periférica, índice tobillo-brazo y flujo arterial.",
    purpose: "Detección de enfermedad arterial periférica en pacientes con factores de riesgo cardiovascular o síntomas de claudicación.",
    snomedCode: "241571004",
    snomedDisplay: "Doppler ultrasonography of lower extremity arteries",
    specialty: "cardiology",
    specialtySnomedCode: "394579002",
    specialtyDisplay: "Cardiology",
    priority: "condicional",
    prepInstructions: "No requiere preparación especial. Usar ropa cómoda que permita acceso a miembros inferiores."
  },
  // GYNECOLOGY (4)
  {
    id: "ad-img-transvaginal-us",
    title: "Ecografía ginecológica transvaginal",
    description: "Ecografía transvaginal para evaluación de útero, ovarios y anexos. Permite detección de patología endometrial, miomas, quistes ováricos y otras alteraciones ginecológicas.",
    purpose: "Screening ginecológico dentro del Programa Mujer de EPA Bienestar.",
    snomedCode: "266752005",
    snomedDisplay: "Transvaginal ultrasonography",
    specialty: "gynecology",
    specialtySnomedCode: "394586005",
    specialtyDisplay: "Gynecology",
    priority: "obligatorio",
    prepInstructions: "Vejiga vacía para ecografía transvaginal. Informar fecha de última menstruación."
  },
  {
    id: "ad-img-mammography",
    title: "Mamografía bilateral",
    description: "Mamografía bilateral digital para screening de cáncer de mama. Clasificación BI-RADS. Indicada en mujeres mayores de 40 años o con factores de riesgo.",
    purpose: "Screening mamario dentro del Programa Mujer de EPA Bienestar según guías nacionales e internacionales.",
    snomedCode: "71651007",
    snomedDisplay: "Mammography",
    specialty: "gynecology",
    specialtySnomedCode: "394586005",
    specialtyDisplay: "Gynecology",
    priority: "obligatorio",
    prepInstructions: "No aplicar desodorante, talco ni cremas en axilas o mamas el día del estudio. Idealmente realizar en primera fase del ciclo menstrual."
  },
  {
    id: "ad-img-breast-us",
    title: "Ecografía mamaria",
    description: "Ecografía mamaria bilateral como complemento de mamografía, especialmente útil en mamas densas. Permite caracterización de lesiones detectadas en mamografía.",
    purpose: "Complemento diagnóstico de mamografía en pacientes con mamas densas o hallazgos que requieren evaluación adicional.",
    snomedCode: "47079000",
    snomedDisplay: "Ultrasonography of breast",
    specialty: "gynecology",
    specialtySnomedCode: "394586005",
    specialtyDisplay: "Gynecology",
    priority: "condicional",
    prepInstructions: "No requiere preparación especial. Complemento de mamografía en mamas densas."
  },
  {
    id: "ad-img-dexa",
    title: "Densitometría ósea (DEXA)",
    description: "Densitometría ósea por absorciometría dual de rayos X (DEXA) de columna lumbar y fémur para evaluación de densidad mineral ósea y riesgo de osteoporosis.",
    purpose: "Screening de osteoporosis en mujeres perimenopáusicas y postmenopáusicas dentro del Programa Mujer.",
    snomedCode: "312681000",
    snomedDisplay: "Dual energy X-ray absorptiometry",
    specialty: "gynecology",
    specialtySnomedCode: "394586005",
    specialtyDisplay: "Gynecology",
    priority: "recomendado",
    prepInstructions: "No tomar suplementos de calcio 24 horas antes. No realizar estudios con contraste 72 horas antes."
  },
  // ENDOCRINOLOGY (3)
  {
    id: "ad-img-thyroid-us",
    title: "Ecografía tiroidea",
    description: "Ecografía de glándula tiroides para evaluación de nódulos tiroideos, bocio, tiroiditis y otras alteraciones estructurales. Clasificación TI-RADS.",
    purpose: "Evaluación tiroidea en pacientes con alteraciones de TSH o hallazgos clínicos sugestivos de patología tiroidea.",
    snomedCode: "274730009",
    snomedDisplay: "Ultrasonography of thyroid gland",
    specialty: "endocrinology",
    specialtySnomedCode: "394583002",
    specialtyDisplay: "Endocrinology",
    priority: "condicional",
    prepInstructions: "No requiere preparación especial. Retirar collares y accesorios del cuello."
  },
  {
    id: "ad-img-abdominal-us",
    title: "Ecografía abdominal (hígado graso)",
    description: "Ecografía abdominal con foco en hígado para evaluación de esteatosis hepática (hígado graso), hepatomegalia y otras alteraciones abdominales.",
    purpose: "Screening de esteatosis hepática en pacientes con síndrome metabólico, obesidad o alteraciones de perfil lipídico/hepático.",
    snomedCode: "45036003",
    snomedDisplay: "Ultrasonography of abdomen",
    specialty: "endocrinology",
    specialtySnomedCode: "394583002",
    specialtyDisplay: "Endocrinology",
    priority: "recomendado",
    prepInstructions: "Ayuno de 6-8 horas previas. No masticar chicle ni fumar antes del estudio."
  },
  {
    id: "ad-img-dexa-body",
    title: "Composición corporal por DEXA",
    description: "Estudio de composición corporal completa por absorciometría dual de rayos X (DEXA) para cuantificación de masa grasa, masa magra y distribución de grasa corporal.",
    purpose: "Evaluación de composición corporal en pacientes con obesidad o síndrome metabólico para guiar plan nutricional y de actividad física.",
    snomedCode: "312681000",
    snomedDisplay: "Dual energy X-ray absorptiometry",
    specialty: "endocrinology",
    specialtySnomedCode: "394583002",
    specialtyDisplay: "Endocrinology",
    priority: "recomendado",
    prepInstructions: "No tomar suplementos de calcio 24 horas antes. Ropa cómoda sin elementos metálicos."
  },
  // PULMONOLOGY (2)
  {
    id: "ad-img-chest-xray",
    title: "Rx de tórax frente y perfil",
    description: "Radiografía de tórax posteroanterior y perfil para evaluación de campos pulmonares, silueta cardíaca, mediastino y estructuras óseas torácicas.",
    purpose: "Screening pulmonar básico en pacientes fumadores o con scores bajos en dimensiones de tabaquismo/sueño del LE8.",
    snomedCode: "399208008",
    snomedDisplay: "Plain chest X-ray",
    specialty: "pulmonology",
    specialtySnomedCode: "418112009",
    specialtyDisplay: "Pulmonology",
    priority: "obligatorio",
    prepInstructions: "No requiere preparación especial. Retirar objetos metálicos del tórax. Informar si existe posibilidad de embarazo."
  },
  {
    id: "ad-img-ldct-chest",
    title: "TC de tórax baja dosis (screening tabaco)",
    description: "Tomografía computada de tórax de baja dosis para screening de cáncer de pulmón en pacientes con antecedentes significativos de tabaquismo (> 20 paquetes-año).",
    purpose: "Screening de cáncer de pulmón según guías USPSTF en pacientes con exposición significativa al tabaco.",
    snomedCode: "241540006",
    snomedDisplay: "CT of chest",
    specialty: "pulmonology",
    specialtySnomedCode: "418112009",
    specialtyDisplay: "Pulmonology",
    priority: "condicional",
    prepInstructions: "No requiere ayuno. Evitar objetos metálicos. Informar si es alérgico al contraste yodado."
  },
  // TRAUMATOLOGY (3)
  {
    id: "ad-img-spine-xray",
    title: "Rx columna dorso-lumbar",
    description: "Radiografía de columna dorsal y lumbar frente y perfil para evaluación de alineación vertebral, espacios discales, signos de artrosis y fracturas vertebrales.",
    purpose: "Evaluación de columna en pacientes con sedentarismo significativo, dolor dorso-lumbar o factores de riesgo para patología vertebral.",
    snomedCode: "168537006",
    snomedDisplay: "Plain radiography of spine",
    specialty: "traumatology",
    specialtySnomedCode: "394801008",
    specialtyDisplay: "Traumatology",
    priority: "condicional",
    prepInstructions: "No requiere preparación especial. Retirar objetos metálicos de la zona a estudiar."
  },
  {
    id: "ad-img-knee-xray",
    title: "Rx de rodillas bilateral",
    description: "Radiografía bilateral de rodillas frente, perfil y axial de rótula para evaluación de espacio articular, signos de gonartrosis y alineación rotuliana.",
    purpose: "Evaluación articular de rodillas en pacientes con sobrepeso, sedentarismo o sintomatología articular.",
    snomedCode: "168599001",
    snomedDisplay: "Plain radiography of knee",
    specialty: "traumatology",
    specialtySnomedCode: "394801008",
    specialtyDisplay: "Traumatology",
    priority: "condicional",
    prepInstructions: "No requiere preparación especial."
  },
  {
    id: "ad-img-joint-us",
    title: "Ecografía articular (hombro/rodilla)",
    description: "Ecografía musculoesquelética de articulación (hombro o rodilla) para evaluación de tendones, ligamentos, bursas y derrames articulares.",
    purpose: "Evaluación de partes blandas articulares en pacientes con sintomatología osteomuscular identificada en evaluación traumatológica.",
    snomedCode: "241637007",
    snomedDisplay: "Ultrasonography of joint",
    specialty: "traumatology",
    specialtySnomedCode: "394801008",
    specialtyDisplay: "Traumatology",
    priority: "condicional",
    prepInstructions: "No requiere preparación especial. Usar ropa que permita acceso a la articulación."
  },
  // OTHER (2)
  {
    id: "ad-img-fundoscopy",
    title: "Fondo de ojo / retinografía",
    description: "Examen de fondo de ojo con retinografía digital para evaluación de retina, mácula, disco óptico y vasculatura retiniana. Permite detección de retinopatía diabética e hipertensiva.",
    purpose: "Screening de retinopatía en pacientes con diabetes, hipertensión arterial o factores de riesgo metabólicos identificados en LE8.",
    snomedCode: "314971001",
    snomedDisplay: "Camera fundoscopy",
    specialty: "other",
    specialtySnomedCode: "394594003",
    specialtyDisplay: "Ophthalmology",
    priority: "condicional",
    prepInstructions: "Se realizará dilatación pupilar. No conducir durante 4-6 horas post estudio. Llevar anteojos de sol."
  },
  {
    id: "ad-img-renal-us",
    title: "Ecografía renal bilateral",
    description: "Ecografía renal bilateral para evaluación de tamaño, forma, ecogenicidad y presencia de litiasis, quistes u otras alteraciones renales.",
    purpose: "Evaluación renal en pacientes con hipertensión arterial, diabetes o alteraciones del filtrado glomerular detectadas en laboratorio.",
    snomedCode: "268547008",
    snomedDisplay: "Ultrasonography of urinary system",
    specialty: "other",
    specialtySnomedCode: "394589003",
    specialtyDisplay: "Nephrology",
    priority: "condicional",
    prepInstructions: "Hidratación adecuada previa. Vejiga llena para mejor visualización."
  }
];

let count = 0;
for (const def of definitions) {
  const resource = buildActivityDefinition(def);
  const filePath = path.join(OUTPUT_DIR, def.id + '.json');
  fs.writeFileSync(filePath, JSON.stringify(resource, null, 2) + '\n', 'utf8');
  console.log('Created: ' + def.id + '.json');
  count++;
}

console.log('\nTotal files created: ' + count);
