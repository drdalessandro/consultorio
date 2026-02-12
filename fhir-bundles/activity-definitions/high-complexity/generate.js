const fs = require('fs');
const path = require('path');

const SPECIALTY_SNOMED = {
  cardiology:    { code: "394579002", display: "Cardiology" },
  gynecology:    { code: "394586005", display: "Gynecology" },
  endocrinology: { code: "394583002", display: "Endocrinology" },
  pulmonology:   { code: "418112009", display: "Pulmonary medicine" },
  traumatology:  { code: "394801008", display: "Trauma and orthopedics" },
};

const definitions = [
  {
    id: "ad-hc-ergometry",
    name: "ErgometriaPEG",
    title: "Ergometría / PEG",
    description: "Prueba de esfuerzo graduada (ergometría) para evaluación de la capacidad funcional cardiovascular y detección de isquemia miocárdica.",
    purpose: "Evaluar respuesta cardiovascular al esfuerzo físico controlado, detectar isquemia inducida por ejercicio y determinar capacidad funcional.",
    snomedCode: "76746007",
    snomedDisplay: "Cardiovascular stress testing",
    specialty: "cardiology",
    priority: "obligatorio",
    prep: "Suspender betabloqueantes 48 horas antes (consultar al médico). Ropa y calzado deportivo. Ayuno de 2 horas. Traer ECG previo."
  },
  {
    id: "ad-hc-calcium-score",
    name: "ScoreCalcioCoronario",
    title: "Score de Calcio coronario (Angio-TC)",
    description: "Tomografía computada para cuantificación de calcio en arterias coronarias como marcador de aterosclerosis subclínica.",
    purpose: "Estratificar riesgo cardiovascular mediante cuantificación de calcificaciones coronarias en pacientes asintomáticos con riesgo intermedio.",
    snomedCode: "418714002",
    snomedDisplay: "Coronary artery calcium score measurement",
    specialty: "cardiology",
    priority: "condicional",
    prep: "Ayuno de 4 horas. No consumir cafeína 12 horas antes. Informar si es alérgico al contraste yodado. Frecuencia cardíaca idealmente < 65 lpm."
  },
  {
    id: "ad-hc-abpm-24h",
    name: "MAPA24Horas",
    title: "MAPA 24hs",
    description: "Monitoreo ambulatorio de presión arterial durante 24 horas para evaluación del patrón tensional diurno y nocturno.",
    purpose: "Confirmar diagnóstico de hipertensión arterial, evaluar efectividad del tratamiento antihipertensivo y detectar patrones de variabilidad tensional.",
    snomedCode: "252076005",
    snomedDisplay: "Ambulatory blood pressure monitoring",
    specialty: "cardiology",
    priority: "condicional",
    prep: "Actividad habitual durante las 24 horas. Evitar baños/duchas con el equipo. Registro de actividades y síntomas."
  },
  {
    id: "ad-hc-holter-24h",
    name: "HolterECG24Horas",
    title: "Holter ECG 24hs",
    description: "Monitoreo electrocardiográfico continuo ambulatorio de 24 horas para detección de arritmias y eventos isquémicos.",
    purpose: "Detectar arritmias paroxísticas, evaluar síntomas de palpitaciones o síncope y monitorizar respuesta al tratamiento antiarrítmico.",
    snomedCode: "252239006",
    snomedDisplay: "Continuous ambulatory electrocardiographic monitoring",
    specialty: "cardiology",
    priority: "condicional",
    prep: "Actividad habitual durante las 24 horas. Evitar baños/duchas con el equipo. Registro de síntomas con horario."
  },
  {
    id: "ad-hc-cardiac-mri",
    name: "RMNCardiaca",
    title: "RMN cardíaca",
    description: "Resonancia magnética nuclear cardíaca para evaluación detallada de estructura, función y caracterización tisular del miocardio.",
    purpose: "Evaluar miocardiopatías, viabilidad miocárdica, enfermedad pericárdica y anomalías congénitas cardíacas con alta resolución espacial.",
    snomedCode: "241620005",
    snomedDisplay: "Magnetic resonance imaging of heart",
    specialty: "cardiology",
    priority: "especializado",
    prep: "Informar sobre implantes metálicos, marcapasos o claustrofobia. Ayuno de 4 horas. Duración aprox. 45-60 minutos. Puede requerir gadolinio."
  },
  {
    id: "ad-hc-spect-cardiac",
    name: "SPECTCardiaco",
    title: "SPECT / PCI cardíaco",
    description: "Perfusión miocárdica por SPECT (tomografía computarizada por emisión de fotón único) para evaluación de isquemia e infarto.",
    purpose: "Detectar y cuantificar isquemia miocárdica, evaluar viabilidad del miocardio y estratificar riesgo en enfermedad coronaria conocida o sospechada.",
    snomedCode: "373205008",
    snomedDisplay: "Nuclear medicine imaging of heart",
    specialty: "cardiology",
    priority: "especializado",
    prep: "Suspender betabloqueantes y calcioantagonistas según indicación médica. Ayuno de 4 horas. No consumir cafeína 24 horas antes. El estudio dura entre 3-4 horas."
  },
  {
    id: "ad-hc-coronary-angio",
    name: "Coronariografia",
    title: "Coronariografía",
    description: "Cateterismo cardíaco con angiografía coronaria para visualización directa de las arterias coronarias.",
    purpose: "Diagnosticar enfermedad coronaria obstructiva, evaluar anatomía coronaria previo a revascularización y valorar lesiones en pacientes con síndromes coronarios.",
    snomedCode: "33367005",
    snomedDisplay: "Coronary arteriography",
    specialty: "cardiology",
    priority: "especializado",
    prep: "Ayuno de 6-8 horas. Estudios previos de laboratorio requeridos: creatinina, coagulograma, hemograma. Informar alergias al contraste. Requiere internación breve."
  },
  {
    id: "ad-hc-breast-mri",
    name: "RMNMamaria",
    title: "RMN mamaria",
    description: "Resonancia magnética nuclear mamaria con contraste para evaluación complementaria de lesiones mamarias.",
    purpose: "Complementar diagnóstico en pacientes de alto riesgo, evaluar extensión de enfermedad conocida y screening en portadoras de mutaciones BRCA.",
    snomedCode: "241615005",
    snomedDisplay: "Magnetic resonance imaging of breast",
    specialty: "gynecology",
    priority: "especializado",
    prep: "Idealmente realizar entre días 7-14 del ciclo menstrual. Informar sobre implantes mamarios, marcapasos o claustrofobia. Puede requerir gadolinio."
  },
  {
    id: "ad-hc-colposcopy",
    name: "Colposcopia",
    title: "Colposcopía",
    description: "Examen colposcópico del cuello uterino con magnificación para evaluación de lesiones cervicales.",
    purpose: "Evaluar lesiones cervicales detectadas en citología o test de HPV positivo, guiar biopsias dirigidas y seguimiento de patología cervical.",
    snomedCode: "12350003",
    snomedDisplay: "Colposcopy",
    specialty: "gynecology",
    priority: "condicional",
    prep: "No usar óvulos ni cremas vaginales 48 horas antes. No mantener relaciones sexuales 48 horas antes. Evitar período menstrual."
  },
  {
    id: "ad-hc-endometrial-biopsy",
    name: "BiopsiaEndometrial",
    title: "Biopsia endometrial",
    description: "Toma de muestra endometrial para estudio histopatológico del revestimiento uterino.",
    purpose: "Evaluar sangrado uterino anormal, descartar hiperplasia o neoplasia endometrial y estudio de infertilidad.",
    snomedCode: "65801008",
    snomedDisplay: "Endometrial biopsy",
    specialty: "gynecology",
    priority: "especializado",
    prep: "Descartar embarazo previo al procedimiento. Puede causar molestias tipo cólico menstrual. Se recomienda analgésico previo según indicación médica."
  },
  {
    id: "ad-hc-thyroid-fna",
    name: "PuncionTiroideaPAAF",
    title: "Punción tiroidea (PAAF)",
    description: "Punción aspirativa con aguja fina de nódulo tiroideo guiada por ecografía para estudio citológico.",
    purpose: "Evaluar naturaleza de nódulos tiroideos sospechosos, descartar malignidad y guiar conducta terapéutica según clasificación Bethesda.",
    snomedCode: "274331003",
    snomedDisplay: "Fine needle aspiration biopsy of thyroid",
    specialty: "endocrinology",
    priority: "especializado",
    prep: "No requiere ayuno. Informar si toma anticoagulantes (puede requerirse suspensión previa). El procedimiento es guiado por ecografía."
  },
  {
    id: "ad-hc-fibroscan",
    name: "FibroScanElastografia",
    title: "FibroScan / elastografía hepática",
    description: "Elastografía transitoria hepática para evaluación no invasiva de fibrosis en enfermedad hepática grasa.",
    purpose: "Cuantificar grado de fibrosis hepática en pacientes con hígado graso no alcohólico (NAFLD/NASH) asociado a síndrome metabólico.",
    snomedCode: "439401001",
    snomedDisplay: "Transient elastography of liver",
    specialty: "endocrinology",
    priority: "condicional",
    prep: "Ayuno de 2-4 horas. No consumir alcohol 72 horas antes. Evaluación no invasiva de fibrosis hepática en hígado graso."
  },
  {
    id: "ad-hc-calorimetry",
    name: "CalorimetriaIndirecta",
    title: "Calorimetría indirecta",
    description: "Medición del gasto energético en reposo mediante calorimetría indirecta para personalización del plan nutricional.",
    purpose: "Determinar tasa metabólica basal real del paciente para optimizar intervenciones nutricionales en sobrepeso, obesidad y trastornos metabólicos.",
    snomedCode: "252061009",
    snomedDisplay: "Measurement of resting energy expenditure",
    specialty: "endocrinology",
    priority: "recomendado",
    prep: "Ayuno de 8-12 horas. Reposo de 30 minutos previo al estudio. No realizar ejercicio el día del estudio. No fumar 4 horas antes."
  },
  {
    id: "ad-hc-spirometry",
    name: "EspirometriaConBroncodilatador",
    title: "Espirometría con broncodilatador",
    description: "Prueba de función pulmonar con maniobra pre y post broncodilatador para evaluación de volúmenes y flujos respiratorios.",
    purpose: "Diagnosticar y clasificar trastornos ventilatorios obstructivos y restrictivos, evaluar reversibilidad y monitorizar enfermedad pulmonar.",
    snomedCode: "127783003",
    snomedDisplay: "Spirometry",
    specialty: "pulmonology",
    priority: "obligatorio",
    prep: "No fumar 4 horas antes. Suspender broncodilatadores de acción corta 6 horas antes y de acción larga 12 horas antes (consultar médico). Ropa cómoda."
  },
  {
    id: "ad-hc-dlco",
    name: "DifusionCODLCO",
    title: "Difusión de CO (DLCO)",
    description: "Medición de la capacidad de difusión pulmonar de monóxido de carbono para evaluar intercambio gaseoso alvéolo-capilar.",
    purpose: "Evaluar integridad de la membrana alvéolo-capilar, complementar diagnóstico de enfermedades intersticiales y enfisema pulmonar.",
    snomedCode: "252472004",
    snomedDisplay: "Lung diffusion capacity measurement",
    specialty: "pulmonology",
    priority: "condicional",
    prep: "No fumar 24 horas antes. No consumir alcohol 24 horas antes. Misma preparación que espirometría."
  },
  {
    id: "ad-hc-polysomnography",
    name: "Polisomnografia",
    title: "Polisomnografía / estudio de sueño",
    description: "Estudio polisomnográfico nocturno en laboratorio de sueño para evaluación integral de trastornos del sueño.",
    purpose: "Diagnosticar apnea obstructiva del sueño, trastornos del movimiento durante el sueño y otras patologías del sueño que afectan la salud cardiovascular.",
    snomedCode: "60554003",
    snomedDisplay: "Polysomnography",
    specialty: "pulmonology",
    priority: "condicional",
    prep: "No consumir cafeína ni alcohol el día del estudio. No dormir siesta ese día. Traer medicación habitual y ropa para dormir. Estudio nocturno en laboratorio de sueño."
  },
  {
    id: "ad-hc-home-polygraph",
    name: "PoligrafiaRespiratoriaDomiciliaria",
    title: "Poligrafía respiratoria domiciliaria",
    description: "Estudio simplificado de sueño realizado en domicilio para screening de apnea obstructiva del sueño.",
    purpose: "Screening y diagnóstico de apnea obstructiva del sueño en pacientes con alta probabilidad pretest, como alternativa a la polisomnografía en laboratorio.",
    snomedCode: "60554003",
    snomedDisplay: "Polysomnography",
    specialty: "pulmonology",
    priority: "condicional",
    prep: "No consumir cafeína ni alcohol el día del estudio. El equipo se coloca en el domicilio. Seguir instrucciones del técnico para la colocación."
  },
  {
    id: "ad-hc-6mwt",
    name: "TestCaminata6Minutos",
    title: "Test de caminata 6 minutos",
    description: "Prueba de caminata de 6 minutos para evaluación de la capacidad funcional y tolerancia al ejercicio submáximo.",
    purpose: "Evaluar capacidad funcional, respuesta al tratamiento y pronóstico en enfermedades cardiopulmonares crónicas.",
    snomedCode: "252478000",
    snomedDisplay: "Six minute walk test",
    specialty: "pulmonology",
    priority: "recomendado",
    prep: "Ropa y calzado cómodos para caminar. No realizar ejercicio intenso 2 horas antes. Continuar con medicación habitual. Desayuno liviano previo."
  },
  {
    id: "ad-hc-hrct-chest",
    name: "TCToraxAltaResolucion",
    title: "TC tórax alta resolución",
    description: "Tomografía computada de tórax de alta resolución (HRCT) para evaluación del parénquima pulmonar.",
    purpose: "Diagnosticar y evaluar enfermedades pulmonares intersticiales, bronquiectasias, enfisema y otras patologías parenquimatosas pulmonares.",
    snomedCode: "241540006",
    snomedDisplay: "CT of chest",
    specialty: "pulmonology",
    priority: "especializado",
    prep: "No requiere ayuno. Informar si es alérgico al contraste. Retirar objetos metálicos del tórax."
  },
  {
    id: "ad-hc-joint-mri",
    name: "RMNArticular",
    title: "RMN articular (rodilla/hombro/columna)",
    description: "Resonancia magnética nuclear articular para evaluación detallada de estructuras articulares, ligamentarias y meniscales.",
    purpose: "Evaluar lesiones ligamentarias, meniscales, cartilaginosas y óseas en articulaciones sintomáticas para planificación terapéutica.",
    snomedCode: "241577003",
    snomedDisplay: "Magnetic resonance imaging of joint",
    specialty: "traumatology",
    priority: "especializado",
    prep: "Informar sobre implantes metálicos, marcapasos o claustrofobia. Retirar todos los objetos metálicos. Duración aprox. 30-45 minutos."
  },
  {
    id: "ad-hc-arthroscopy",
    name: "ArtroscopiaDiagnostica",
    title: "Artroscopía diagnóstica",
    description: "Procedimiento artroscópico diagnóstico para visualización directa de estructuras intraarticulares.",
    purpose: "Diagnóstico directo de patología intraarticular cuando los estudios por imágenes son insuficientes, con posibilidad de tratamiento simultáneo.",
    snomedCode: "63707004",
    snomedDisplay: "Arthroscopy",
    specialty: "traumatology",
    priority: "especializado",
    prep: "Ayuno de 8 horas. Requiere anestesia (regional o general). Estudios prequirúrgicos previos: laboratorio, ECG, evaluación cardiológica. Informar alergias."
  },
  {
    id: "ad-hc-emg",
    name: "Electromiografia",
    title: "Electromiografía (EMG)",
    description: "Estudio electromiográfico y de velocidad de conducción nerviosa para evaluación de patología neuromuscular.",
    purpose: "Diagnosticar neuropatías periféricas, radiculopatías, síndrome del túnel carpiano y otras patologías neuromusculares asociadas a dolor musculoesquelético.",
    snomedCode: "42803009",
    snomedDisplay: "Electromyography",
    specialty: "traumatology",
    priority: "especializado",
    prep: "No aplicar cremas o lociones en la zona a estudiar. Informar si toma anticoagulantes. Puede causar molestias leves."
  },
];

function buildResource(def) {
  const spec = SPECIALTY_SNOMED[def.specialty];
  return {
    resourceType: "ActivityDefinition",
    id: def.id,
    meta: {
      profile: [
        "https://epa-bienestar.com.ar/fhir/StructureDefinition/EPA-ActivityDef-HighComplexity"
      ]
    },
    url: "https://epa-bienestar.com.ar/fhir/ActivityDefinition/" + def.id,
    version: "1.0.0",
    name: def.name,
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
              code: spec.code,
              display: spec.display
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
        valueString: def.prep
      }
    ]
  };
}

const outDir = __dirname;
let count = 0;

for (const def of definitions) {
  const resource = buildResource(def);
  const filePath = path.join(outDir, def.id + ".json");
  fs.writeFileSync(filePath, JSON.stringify(resource, null, 2) + "\n", "utf8");
  console.log("Created: " + def.id + ".json");
  count++;
}

console.log("\nTotal files generated: " + count);
