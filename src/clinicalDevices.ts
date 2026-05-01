// SPDX-FileCopyrightText: Copyright EPA Bienestar
// SPDX-License-Identifier: Apache-2.0
//
// Tipos clínicos de Devices que vigila Consultorio. Se mapean por SNOMED CT
// (Device.type) y por el LOINC asociado en Observation cuando se trata
// de mediciones (Device → genera Observation con LOINC del parámetro medido).
//
// Para v1 nos enfocamos en los 4 que tienen mayor impacto en RCV femenino:
//   - Tensiómetro (TA sistólica/diastólica)
//   - Balanza (peso, IMC derivado)
//   - Glucómetro (glucemia capilar)
//   - Tracker de actividad (pasos, frecuencia cardíaca, sueño)

import type { Coding } from '@medplum/fhirtypes';

export type ClinicalDeviceKind = 'blood-pressure' | 'scale' | 'glucometer' | 'activity-tracker';

export interface ClinicalDeviceProfile {
  kind: ClinicalDeviceKind;
  label: string;
  shortLabel: string;
  /** SNOMED CT codes de Device.type (uno o varios sinónimos). */
  deviceTypes: Coding[];
  /** LOINC codes esperados en Observation generadas por este device. */
  observationLoincs: string[];
  /** Días sin transmitir antes de marcar inactividad. */
  inactivityDays: number;
  /** Color Mantine. */
  color: string;
  /** Icon name para Tabler. */
  icon: 'heartbeat' | 'scale' | 'droplet' | 'activity';
}

export const CLINICAL_DEVICES: ClinicalDeviceProfile[] = [
  {
    kind: 'blood-pressure',
    label: 'Tensiómetro',
    shortLabel: 'TA',
    deviceTypes: [
      { system: 'http://snomed.info/sct', code: '23272001', display: 'Pressure measuring device' },
      { system: 'http://snomed.info/sct', code: '465517006', display: 'Blood pressure monitor' },
    ],
    observationLoincs: ['85354-9', '8480-6', '8462-4'],
    inactivityDays: 14,
    color: 'red',
    icon: 'heartbeat',
  },
  {
    kind: 'scale',
    label: 'Balanza',
    shortLabel: 'Peso',
    deviceTypes: [
      { system: 'http://snomed.info/sct', code: '5880005', display: 'Weighing scale' },
      { system: 'http://snomed.info/sct', code: '462520003', display: 'Body weight scale' },
    ],
    observationLoincs: ['29463-7', '39156-5'],
    inactivityDays: 14,
    color: 'epa',
    icon: 'scale',
  },
  {
    kind: 'glucometer',
    label: 'Glucómetro',
    shortLabel: 'Glucemia',
    deviceTypes: [
      { system: 'http://snomed.info/sct', code: '337414009', display: 'Blood glucose meter' },
    ],
    observationLoincs: ['15074-8', '14743-9', '4548-4'],
    inactivityDays: 7,
    color: 'orange',
    icon: 'droplet',
  },
  {
    kind: 'activity-tracker',
    label: 'Tracker de actividad',
    shortLabel: 'Actividad',
    deviceTypes: [
      { system: 'http://snomed.info/sct', code: '706767009', display: 'Personal activity monitor' },
    ],
    observationLoincs: ['41950-7', '8867-4', '93832-4'],
    inactivityDays: 3,
    color: 'green',
    icon: 'activity',
  },
];

const DEVICE_BY_KIND = new Map(CLINICAL_DEVICES.map((d) => [d.kind, d]));
export function getDeviceProfile(kind: ClinicalDeviceKind): ClinicalDeviceProfile | undefined {
  return DEVICE_BY_KIND.get(kind);
}

/**
 * Identifica un Device como uno de nuestros tipos clínicos comparando
 * coding contra Device.type[].coding[].
 */
export function classifyDeviceType(typeCodings: Coding[] | undefined): ClinicalDeviceKind | undefined {
  if (!typeCodings) return undefined;
  for (const profile of CLINICAL_DEVICES) {
    const match = profile.deviceTypes.some((known) =>
      typeCodings.some((c) => c.system === known.system && c.code === known.code)
    );
    if (match) return profile.kind;
  }
  return undefined;
}
