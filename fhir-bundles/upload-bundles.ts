#!/usr/bin/env npx ts-node

/**
 * upload-bundles.ts
 *
 * Lee todos los JSONs de fhir-bundles/ y los sube como Transaction Bundles
 * a la API FHIR de Medplum usando @medplum/core SDK.
 *
 * Medplum self-hosted requiere IDs en formato UUID (server-assigned).
 * Este script:
 *   - Elimina el campo "id" de cada recurso antes de subir
 *   - Usa conditional PUT (ResourceType?url=<canonical>) para idempotencia
 *   - Mantiene fullUrl con la URL canónica para resolución de referencias internas
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

// Archivos en la raíz que NO son recursos FHIR
const IGNORED_FILES = new Set(['package.json', 'package-lock.json', 'tsconfig.json']);

// Orden de subida: dependencias primero
const UPLOAD_ORDER = [
  'value-sets',
  'activity-definitions',
  'plan-definitions',
  'questionnaires',
];

// Errores que no se deben reintentar (errores de validación/cliente)
const NON_RETRYABLE_ERRORS = [
  'Invalid id',
  'Invalid resource type',
  'Bad Request',
  'Not found',
  'Unauthorized',
  'Forbidden',
  'OperationOutcome',
];

interface UploadResult {
  file: string;
  status: 'ok' | 'error' | 'skipped';
  resourceCount: number;
  detail?: string;
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
 * Prepara un entry del Bundle para Medplum:
 * - Elimina el campo "id" del recurso (Medplum asigna UUIDs)
 * - Usa conditional PUT con ?url=<canonical> si el recurso tiene campo "url"
 * - Usa POST si no tiene campo "url"
 * - Establece fullUrl con la URL canónica del recurso
 */
function prepareEntryForMedplum(entry: BundleEntry): BundleEntry {
  const resource = entry.resource as any;
  if (!resource?.resourceType) return entry;

  const canonicalUrl = resource.url as string | undefined;
  const resourceType = resource.resourceType as string;

  // Eliminar el id — Medplum asignará un UUID
  delete resource.id;

  if (canonicalUrl) {
    // Conditional PUT: idempotente, busca por URL canónica
    return {
      fullUrl: canonicalUrl,
      resource,
      request: {
        method: 'PUT',
        url: `${resourceType}?url=${encodeURIComponent(canonicalUrl)}`,
      },
    };
  }

  // Sin URL canónica — usar POST (Medplum crea recurso nuevo)
  return {
    resource,
    request: {
      method: 'POST',
      url: resourceType,
    },
  };
}

/**
 * Lee un JSON y lo convierte en un Transaction Bundle listo para Medplum.
 * - Si ya es un Bundle transaction, transforma cada entry.
 * - Si es un recurso individual, lo envuelve en un transaction Bundle.
 */
function toTransactionBundle(filePath: string): { bundle: Bundle; resourceCount: number } {
  const raw = fs.readFileSync(filePath, 'utf-8');
  const json = JSON.parse(raw);

  // Ya es un Transaction Bundle — transformar cada entry
  if (json.resourceType === 'Bundle' && json.type === 'transaction') {
    const entries = (json.entry ?? []).map((entry: BundleEntry) => prepareEntryForMedplum(entry));
    const bundle: Bundle = {
      resourceType: 'Bundle',
      type: 'transaction',
      entry: entries,
    };
    return {
      bundle,
      resourceCount: entries.length,
    };
  }

  // Recurso individual — envolver en transaction Bundle
  if (json.resourceType) {
    const entry = prepareEntryForMedplum({
      resource: json,
      request: {
        method: 'PUT',
        url: `${json.resourceType}/${json.id ?? ''}`,
      },
    });

    const bundle: Bundle = {
      resourceType: 'Bundle',
      type: 'transaction',
      entry: [entry],
    };
    return { bundle, resourceCount: 1 };
  }

  throw new Error(`Archivo no reconocido como recurso FHIR: ${filePath}`);
}

/**
 * Agrupa archivos JSON por subdirectorio según el orden de subida definido.
 */
function groupFilesByUploadOrder(): Map<string, string[]> {
  const grouped = new Map<string, string[]>();

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

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Determina si un error es retryable (solo errores de red/servidor).
 */
function isRetryableError(err: any): boolean {
  // Errores con status 4xx no se reintentan
  const status = err.status ?? err.statusCode;
  if (status && status >= 400 && status < 500) {
    return false;
  }

  // Errores con mensajes conocidos de validación no se reintentan
  const message = err.message ?? String(err);
  for (const pattern of NON_RETRYABLE_ERRORS) {
    if (message.includes(pattern)) {
      return false;
    }
  }

  // Errores de OperationOutcome de Medplum no se reintentan
  if (err.outcome?.issue) {
    return false;
  }

  return true;
}

/**
 * Sube un bundle con reintentos solo para errores de red/servidor.
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

      if (!isRetryableError(err)) {
        throw err;
      }

      if (attempt < maxRetries) {
        const waitMs = Math.pow(2, attempt + 1) * 1000;
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
        const { bundle, resourceCount } = toTransactionBundle(file);
        totalResources += resourceCount;

        if (isDryRun) {
          // Validar que cada entry tiene request URL correcta
          const issues: string[] = [];
          for (const entry of bundle.entry ?? []) {
            if (!entry.request?.url) {
              issues.push('Entry sin request.url');
            }
            const resource = entry.resource as any;
            if (resource?.id) {
              issues.push(`Recurso aún tiene id="${resource.id}" (debería haberse eliminado)`);
            }
          }

          if (issues.length > 0) {
            console.log(`  [ISSUE] ${relativePath}: ${issues.join('; ')}`);
            results.push({ file: relativePath, status: 'error', resourceCount, detail: issues.join('; ') });
          } else {
            const urls = (bundle.entry ?? []).map((e) => e.request?.url).join(', ');
            console.log(`  [OK] ${relativePath} (${resourceCount} recurso${resourceCount === 1 ? '' : 's'}) → ${urls}`);
            results.push({ file: relativePath, status: 'ok', resourceCount });
          }
          continue;
        }

        // Subir el transaction bundle
        const response = await uploadWithRetry(medplum, bundle);

        // Verificar respuestas individuales
        const errors = (response.entry ?? []).filter((e: any) => {
          const status = e.response?.status;
          return status && !status.startsWith('2');
        });

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
