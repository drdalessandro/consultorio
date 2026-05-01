// SPDX-FileCopyrightText: Copyright EPA Bienestar
// SPDX-License-Identifier: Apache-2.0
export interface MedplumAppConfig {
  baseUrl?: string;
  googleClientId?: string;
  clientId?: string;
  /** Project Medplum donde vive la data del consultorio (Mujer por default). */
  projectId?: string;
  /** Etiqueta UI del proyecto activo. */
  projectLabel?: string;
}

const config: MedplumAppConfig = {
  baseUrl: import.meta.env?.MEDPLUM_BASE_URL,
  googleClientId: import.meta.env?.GOOGLE_CLIENT_ID,
  clientId: import.meta.env?.MEDPLUM_CLIENT_ID,
  projectId: import.meta.env?.MEDPLUM_PROJECT_ID,
  projectLabel: import.meta.env?.MEDPLUM_PROJECT_LABEL ?? 'Programa Mujer',
};

export function getConfig(): MedplumAppConfig {
  return config;
}
