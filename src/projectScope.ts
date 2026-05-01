// SPDX-FileCopyrightText: Copyright EPA Bienestar
// SPDX-License-Identifier: Apache-2.0
//
// Scope al Project Medplum activo. Las queries del dashboard y de pedidos/
// resultados/turnos se restringen al projectId configurado para que
// Consultorio muestre solo data del Project Mujer (foco actual). Cuando se
// sume Hábitos u otro Project, se incluyen aquí los IDs adicionales o se
// cambia a un Client multi-Project.
import { getConfig } from './config';

export function getActiveProjectId(): string | undefined {
  return getConfig().projectId;
}

/**
 * Devuelve un objeto query con `_project` filtrado al Project activo.
 * Si no hay project configurado (entorno dev), no aplica filtro.
 *
 * Uso:
 *   medplum.search('Patient', withProjectScope({ _summary: 'count' }))
 */
export function withProjectScope<T extends Record<string, string>>(query: T = {} as T): T {
  const projectId = getActiveProjectId();
  if (!projectId) return query;
  return { ...query, _project: projectId };
}

/**
 * Builds a `_tag` filter URL for a program code, respecting the EPA tag system.
 * Re-exports `PROGRAM_TAG_SYSTEM` from `./programs` to avoid duplication.
 */
import { PROGRAM_TAG_SYSTEM } from './programs';
export function programTagValue(code: string): string {
  return `${PROGRAM_TAG_SYSTEM}|${code}`;
}
