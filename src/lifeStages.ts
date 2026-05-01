// SPDX-FileCopyrightText: Copyright EPA Bienestar
// SPDX-License-Identifier: Apache-2.0
//
// Etapas de la vida de la mujer — modelo FemTech cardiovascular.
// Cálculo client-side a partir de Patient.birthDate. Buckets diseñados con
// foco en hitos relevantes para salud cardiovascular femenina:
//
//   - Adolescencia (12-19): factores de riesgo emergentes, anticoncepción
//   - Edad reproductiva (20-39): embarazo, lactancia, planificación
//   - Premenopausia (40-49): ventana de prevención, screening
//   - Menopausia (50-59): aumento de riesgo CV, terapia hormonal
//   - Postmenopausia (60+): manejo de comorbilidades, cardioprotección
//
// Si en el futuro se necesita más precisión (ej. perimenopausia explícita,
// embarazo activo), se puede combinar con tags o Conditions específicas.
import type { Patient } from '@medplum/fhirtypes';

export type LifeStageCode =
  | 'pediatric'
  | 'adolescent'
  | 'reproductive'
  | 'premenopause'
  | 'menopause'
  | 'postmenopause';

export interface LifeStage {
  code: LifeStageCode;
  label: string;
  ageRange: [number, number];
  color: string;
  description: string;
}

export const LIFE_STAGES: LifeStage[] = [
  {
    code: 'pediatric',
    label: 'Pediátrica',
    ageRange: [0, 11],
    color: 'gray',
    description: 'Menor de 12 años',
  },
  {
    code: 'adolescent',
    label: 'Adolescencia',
    ageRange: [12, 19],
    color: 'cyan',
    description: 'Factores de riesgo emergentes',
  },
  {
    code: 'reproductive',
    label: 'Edad reproductiva',
    ageRange: [20, 39],
    color: 'pink',
    description: 'Embarazo, lactancia, planificación',
  },
  {
    code: 'premenopause',
    label: 'Premenopausia',
    ageRange: [40, 49],
    color: 'grape',
    description: 'Ventana de prevención cardiovascular',
  },
  {
    code: 'menopause',
    label: 'Menopausia',
    ageRange: [50, 59],
    color: 'red',
    description: 'Aumento de riesgo CV, terapia hormonal',
  },
  {
    code: 'postmenopause',
    label: 'Postmenopausia',
    ageRange: [60, 130],
    color: 'orange',
    description: 'Comorbilidades, cardioprotección',
  },
];

export function calculateAgeYears(birthDate: string | undefined, today: Date = new Date()): number | undefined {
  if (!birthDate) return undefined;
  const birth = new Date(birthDate);
  if (Number.isNaN(birth.getTime())) return undefined;
  let age = today.getFullYear() - birth.getFullYear();
  if (
    today.getMonth() < birth.getMonth() ||
    (today.getMonth() === birth.getMonth() && today.getDate() < birth.getDate())
  ) {
    age -= 1;
  }
  return age;
}

export function getLifeStage(patient: Patient | undefined, today: Date = new Date()): LifeStage | undefined {
  if (!patient || patient.gender === 'male') return undefined;
  const age = calculateAgeYears(patient.birthDate, today);
  if (age === undefined) return undefined;
  return LIFE_STAGES.find((s) => age >= s.ageRange[0] && age <= s.ageRange[1]);
}

export interface LifeStageDistribution {
  stage: LifeStage;
  count: number;
}

export function distributeByLifeStage(
  patients: Patient[],
  today: Date = new Date()
): LifeStageDistribution[] {
  const counts = new Map<LifeStageCode, number>();
  for (const p of patients) {
    const stage = getLifeStage(p, today);
    if (!stage) continue;
    counts.set(stage.code, (counts.get(stage.code) ?? 0) + 1);
  }
  return LIFE_STAGES.filter((s) => s.code !== 'pediatric').map((stage) => ({
    stage,
    count: counts.get(stage.code) ?? 0,
  }));
}
