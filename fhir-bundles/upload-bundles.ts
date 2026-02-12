#!/usr/bin/env npx ts-node

/**
 * upload-bundles.ts
 *
 * Lee todos los JSONs de fhir-bundles/ y los sube como Transaction Bundles
 * a la API FHIR de Medplum usando @medplum/core SDK.
 *
 * Uso:
 *   npx ts-node upload-bundles.ts
 *
 * Variables de entorno requeridas:
 *   MEDPLUM_BASE_URL      — URL base de la API (default: https://api.epa-bienestar.com.ar)
 *   MEDPLUM_CLIENT_ID     — Client ID para autenticación
 *   MEDPLUM_CLIENT_SECRET — Client Secret para autenticación
 *
 * Opciones:
 *   --dry-run    Valida los bundles sin subirlos
 *   --verbose    Muestra detalle de cada entry en la respuesta
 */

import { MedplumClient } from '@medplum/core';
import type { Bundle, BundleEntry } from '@medplum/fhirtypes';
import * as fs from 'fs';
import * as path from 'path';

// Directorio raíz de los bundles (mismo directorio que este script)
const BUNDLES_DIR = path.resolve(__dirname);

// Base URL para construir fullUrl canónicas
const FHIR_BASE = 'https://epa-bienestar.com.ar/fhir';

// Archivos en la raíz que NO son recursos FHIR
const IGNORED_FILES = new Set(['package.json', 'package-lock.json', 'tsconfig.json']);

// Orden de subida: dependencias primero
const UPLOAD_ORDER = [
  'value-sets',
  'activity-definitions',
  'plan-definitions',
  'questionnaires',
];

// Regex FHIR para validar IDs: [A-Za-z0-9\-\.]{1,64}
const FHIR_ID_REGEX = /^[A-Za-z0-9\-.]{1,64}$/;

interface UploadResult {
  file: string;
  status: 'ok' | 'error' | 'skipped';
  resourceCount: number;
  detail?: string;
}

/**
 * Valida que un ID cumpla con la especificación FHIR R4.
 */
function isValidFhirId(id: string): boolean {
  return FHIR_ID_REGEX.test(id);
}

/**
 * Sanitiza un ID para que sea válido en FHIR: reemplaza caracteres inválidos con guiones.
 */
function sanitizeFhirId(id: string): string {
  return id.replace(/[^A-Za-z0-9\-.]/g, '-').slice(0, 64);
}

/**
 * Busca recursivamente archivos .json en un directorio.
 */
function findJsonFiles(dir: string): string[] {
  if (!fs.existsSync(dir)) {
    return [];
  }

  const results: string[] = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...findJsonFiles(fullPath));
    } else if (entry.isFile() && entry.name.endsWith('.json')) {
      results.push(fullPath);
    }
  }

  return results.sort();
}

/**
 * Repara fullUrl inválidos dentro de un Bundle existente.
 * Cambia urn:uuid:<non-uuid> por la URL canónica del recurso.
 */
function fixBundleFullUrls(bundle: Bundle): Bundle {
  if (!bundle.entry) return bundle;

  for (const entry of bundle.entry) {
    if (!entry.fullUrl) continue;

    // Si fullUrl usa urn:uuid: pero el valor NO es un UUID válido, corregir
    if (entry.fullUrl.startsWith('urn:uuid:')) {
      const uuidPart = entry.fullUrl.slice('urn:uuid:'.length);
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

      if (!uuidRegex.test(uuidPart) && entry.resource) {
        const resource = entry.resource as any;
        if (resource.resourceType && resource.id) {
          entry.fullUrl = `${FHIR_BASE}/${resource.resourceType}/${resource.id}`;
        }
      }
    }
  }

  return bundle;
}

/**
 * Valida y repara IDs de recursos dentro de un Bundle.
 * Retorna lista de warnings si hubo correcciones.
 */
function validateAndFixIds(bundle: Bundle, filePath: string): string[] {
  const warnings: string[] = [];

  if (!bundle.entry) return warnings;

  for (const entry of bundle.entry) {
    const resource = entry.resource as any;
    if (!resource?.id) continue;

    if (!isValidFhirId(resource.id)) {
      const originalId = resource.id;
      resource.id = sanitizeFhirId(resource.id);
      warnings.push(`ID corregido: "${originalId}" → "${resource.id}"`);

      // Actualizar request.url si usa el ID original
      if (entry.request?.url?.includes(originalId)) {
        entry.request.url = entry.request.url.replace(originalId, resource.id);
      }

      // Actualizar fullUrl si contiene el ID original
      if (entry.fullUrl?.includes(originalId)) {
        entry.fullUrl = entry.fullUrl.replace(originalId, resource.id);
      }
    }
  }

  return warnings;
}

/**
 * Lee un JSON y lo convierte en un Transaction Bundle si es necesario.
 * - Si ya es un Bundle transaction, repara fullUrls inválidos y lo retorna.
 * - Si es un recurso individual, lo envuelve en un transaction Bundle con PUT.
 */
function toTransactionBundle(filePath: string): { bundle: Bundle; resourceCount: number; warnings: string[] } {
  const raw = fs.readFileSync(filePath, 'utf-8');
  const json = JSON.parse(raw);

  // Ya es un Transaction Bundle
  if (json.resourceType === 'Bundle' && json.type === 'transaction') {
    const bundle = fixBundleFullUrls(json as Bundle);
    const warnings = validateAndFixIds(bundle, filePath);
    return {
      bundle,
      resourceCount: bundle.entry?.length ?? 0,
      warnings,
    };
  }

  // Recurso individual con id — envolver en transaction Bundle con PUT (idempotente)
  if (json.resourceType && json.id) {
    let id = json.id;
    const warnings: string[] = [];

    if (!isValidFhirId(id)) {
      const originalId = id;
      id = sanitizeFhirId(id);
      json.id = id;
      warnings.push(`ID corregido: "${originalId}" → "${id}"`);
    }

    const bundle: Bundle = {
      resourceType: 'Bundle',
      type: 'transaction',
      entry: [
        {
          fullUrl: `${FHIR_BASE}/${json.resourceType}/${id}`,
          resource: json,
          request: {
            method: 'PUT',
            url: `${json.resourceType}/${id}`,
          },
        } as BundleEntry,
      ],
    };
    return { bundle, resourceCount: 1, warnings };
  }

  // Recurso individual sin id — usar POST
  if (json.resourceType) {
    const bundle: Bundle = {
      resourceType: 'Bundle',
      type: 'transaction',
      entry: [
        {
          resource: json,
          request: {
            method: 'POST',
            url: json.resourceType,
          },
        } as BundleEntry,
      ],
    };
    return { bundle, resourceCount: 1, warnings: [] };
  }

  throw new Error(`Archivo no reconocido como recurso FHIR: ${filePath}`);
}

/**
 * Agrupa archivos JSON por subdirectorio según el orden de subida definido.
 */
function groupFilesByUploadOrder(): Map<string, string[]> {
  const grouped = new Map<string, string[]>();

  // Inicializar grupos en orden
  for (const dir of UPLOAD_ORDER) {
    grouped.set(dir, []);
  }
  grouped.set('_other', []);

  for (const dir of UPLOAD_ORDER) {
    const fullDir = path.join(BUNDLES_DIR, dir);
    const files = findJsonFiles(fullDir);
    grouped.set(dir, files);
  }

  // Archivos sueltos en la raíz de fhir-bundles (excluye config)
  const rootFiles = fs.readdirSync(BUNDLES_DIR, { withFileTypes: true })
    .filter((e) => e.isFile() && e.name.endsWith('.json') && !IGNORED_FILES.has(e.name))
    .map((e) => path.join(BUNDLES_DIR, e.name));

  if (rootFiles.length > 0) {
    grouped.set('_other', rootFiles);
  }

  return grouped;
}

/**
 * Pausa asincrónica para retry con backoff.
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Sube un bundle con reintentos y backoff exponencial.
 */
async function uploadWithRetry(
  medplum: MedplumClient,
  bundle: Bundle,
  maxRetries: number = 3
): Promise<Bundle> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await medplum.executeBatch(bundle);
    } catch (err: any) {
      lastError = err;
      // Solo reintentar en errores de red/servidor, no en errores de validación
      const status = err.status ?? err.statusCode;
      if (status && status >= 400 && status < 500) {
        throw err; // Error de cliente, no reintentar
      }
      if (attempt < maxRetries) {
        const waitMs = Math.pow(2, attempt + 1) * 1000; // 2s, 4s, 8s
        console.log(`    Reintentando en ${waitMs / 1000}s (intento ${attempt + 2}/${maxRetries + 1})...`);
        await sleep(waitMs);
      }
    }
  }

  throw lastError;
}

async function main(): Promise<void> {
  const isDryRun = process.argv.includes('--dry-run');
  const isVerbose = process.argv.includes('--verbose');

  // Configuración desde variables de entorno
  const baseUrl = process.env.MEDPLUM_BASE_URL || 'https://api.epa-bienestar.com.ar';
  const clientId = process.env.MEDPLUM_CLIENT_ID;
  const clientSecret = process.env.MEDPLUM_CLIENT_SECRET;

  if (!isDryRun && (!clientId || !clientSecret)) {
    console.error('Error: Se requieren MEDPLUM_CLIENT_ID y MEDPLUM_CLIENT_SECRET');
    console.error('Uso: MEDPLUM_CLIENT_ID=xxx MEDPLUM_CLIENT_SECRET=yyy npx ts-node upload-bundles.ts');
    console.error('Para validar sin subir: npx ts-node upload-bundles.ts --dry-run');
    process.exit(1);
  }

  console.log(`\n=== EPA Bienestar — Upload FHIR Bundles ===`);
  console.log(`API:      ${baseUrl}`);
  console.log(`Modo:     ${isDryRun ? 'DRY RUN (sin subir)' : 'UPLOAD'}\n`);

  // Inicializar cliente Medplum
  const medplum = new MedplumClient({ baseUrl });

  if (!isDryRun) {
    console.log('Autenticando con Medplum...');
    await medplum.startClientLogin(clientId!, clientSecret!);
    console.log('Autenticación exitosa.\n');
  }

  const grouped = groupFilesByUploadOrder();
  const results: UploadResult[] = [];
  let totalResources = 0;

  for (const [group, files] of grouped) {
    if (files.length === 0) continue;

    console.log(`--- ${group} (${files.length} archivo${files.length === 1 ? '' : 's'}) ---`);

    for (const file of files) {
      const relativePath = path.relative(BUNDLES_DIR, file);

      try {
        const { bundle, resourceCount, warnings } = toTransactionBundle(file);
        totalResources += resourceCount;

        // Mostrar warnings de IDs corregidos
        for (const w of warnings) {
          console.log(`  [WARN] ${relativePath}: ${w}`);
        }

        if (isDryRun) {
          // Validar estructura básica
          const issues: string[] = [];
          for (const entry of bundle.entry ?? []) {
            const resource = entry.resource as any;
            if (resource?.id && !isValidFhirId(resource.id)) {
              issues.push(`ID inválido: "${resource.id}"`);
            }
            if (entry.fullUrl?.startsWith('urn:uuid:')) {
              const uuid = entry.fullUrl.slice(9);
              if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(uuid)) {
                issues.push(`fullUrl urn:uuid inválido: "${entry.fullUrl}"`);
              }
            }
          }

          if (issues.length > 0) {
            console.log(`  [ISSUE] ${relativePath}: ${issues.join('; ')}`);
            results.push({ file: relativePath, status: 'error', resourceCount, detail: issues.join('; ') });
          } else {
            console.log(`  [OK] ${relativePath} (${resourceCount} recurso${resourceCount === 1 ? '' : 's'})`);
            results.push({ file: relativePath, status: 'ok', resourceCount });
          }
          continue;
        }

        // Subir el transaction bundle con reintentos
        const response = await uploadWithRetry(medplum, bundle);

        // Verificar respuestas individuales
        const errors = (response.entry ?? []).filter(
          (e: any) => {
            const status = e.response?.status;
            return status && !status.startsWith('2');
          }
        );

        if (isVerbose) {
          for (const e of response.entry ?? []) {
            const res = e.resource as any;
            console.log(`    ${e.response?.status ?? '???'} ${res?.resourceType ?? ''}/${res?.id ?? ''}`);
          }
        }

        if (errors.length > 0) {
          const errorDetail = errors
            .map((e: any) => `${e.response?.status}: ${e.response?.outcome?.issue?.[0]?.diagnostics ?? 'sin detalle'}`)
            .join('; ');
          console.log(`  [WARN] ${relativePath} — ${errors.length}/${resourceCount} errores: ${errorDetail}`);
          results.push({ file: relativePath, status: 'error', resourceCount, detail: errorDetail });
        } else {
          console.log(`  [OK] ${relativePath} (${resourceCount} recurso${resourceCount === 1 ? '' : 's'})`);
          results.push({ file: relativePath, status: 'ok', resourceCount });
        }
      } catch (err: any) {
        const message = err.message ?? String(err);
        console.log(`  [ERROR] ${relativePath} — ${message}`);
        results.push({ file: relativePath, status: 'error', resourceCount: 0, detail: message });
      }
    }

    console.log('');
  }

  // Resumen final
  const ok = results.filter((r) => r.status === 'ok').length;
  const errored = results.filter((r) => r.status === 'error').length;

  console.log('=== Resumen ===');
  console.log(`Archivos procesados: ${results.length}`);
  console.log(`Recursos totales:    ${totalResources}`);
  console.log(`Exitosos:            ${ok}`);
  console.log(`Con errores:         ${errored}`);

  if (errored > 0) {
    console.log('\nArchivos con errores:');
    for (const r of results.filter((r) => r.status === 'error')) {
      console.log(`  - ${r.file}: ${r.detail}`);
    }
    process.exit(1);
  }

  console.log('\nTodos los bundles fueron procesados correctamente.');
}

main().catch((err) => {
  console.error('Error fatal:', err);
  process.exit(1);
});
