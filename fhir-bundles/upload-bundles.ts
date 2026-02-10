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
 *   MEDPLUM_BASE_URL   — URL base de la API (default: https://api.epa-bienestar.com.ar)
 *   MEDPLUM_CLIENT_ID  — Client ID para autenticación
 *   MEDPLUM_CLIENT_SECRET — Client Secret para autenticación
 *
 * Opciones:
 *   --dry-run    Valida los bundles sin subirlos
 */

import { MedplumClient } from '@medplum/core';
import * as fs from 'fs';
import * as path from 'path';

// Directorio raíz de los bundles (mismo directorio que este script)
const BUNDLES_DIR = path.resolve(__dirname);

// Archivos JSON en la raíz que NO son recursos FHIR
const IGNORED_FILES = new Set(['package.json', 'package-lock.json', 'tsconfig.json']);

// Orden de subida: dependencias primero
const UPLOAD_ORDER = [
  'value-sets',
  'activity-definitions',
  'plan-definitions',
  'questionnaires',
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
 * Lee un JSON y lo convierte en un Transaction Bundle si es necesario.
 * - Si ya es un Bundle transaction, lo retorna tal cual.
 * - Si es un recurso individual, lo envuelve en un transaction Bundle con PUT.
 */
function toTransactionBundle(filePath: string): { bundle: any; resourceCount: number } {
  const raw = fs.readFileSync(filePath, 'utf-8');
  const json = JSON.parse(raw);

  // Ya es un Transaction Bundle
  if (json.resourceType === 'Bundle' && json.type === 'transaction') {
    return {
      bundle: json,
      resourceCount: json.entry?.length ?? 0,
    };
  }

  // Recurso individual — envolver en transaction Bundle con PUT (idempotente)
  if (json.resourceType && json.id) {
    const bundle = {
      resourceType: 'Bundle',
      type: 'transaction',
      entry: [
        {
          fullUrl: `urn:uuid:${json.id}`,
          resource: json,
          request: {
            method: 'PUT',
            url: `${json.resourceType}/${json.id}`,
          },
        },
      ],
    };
    return { bundle, resourceCount: 1 };
  }

  // Recurso individual sin id — usar POST
  if (json.resourceType) {
    const bundle = {
      resourceType: 'Bundle',
      type: 'transaction',
      entry: [
        {
          resource: json,
          request: {
            method: 'POST',
            url: json.resourceType,
          },
        },
      ],
    };
    return { bundle, resourceCount: 1 };
  }

  throw new Error(`Archivo no reconocido como recurso FHIR: ${filePath}`);
}

/**
 * Agrupa archivos JSON por subdirectorio según el orden de subida definido.
 * Los archivos que no estén en ningún subdirectorio conocido se agrupan al final.
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

  // Archivos sueltos en la raíz de fhir-bundles (excluye config y el propio script)
  const rootFiles = fs.readdirSync(BUNDLES_DIR, { withFileTypes: true })
    .filter((e) => e.isFile() && e.name.endsWith('.json') && !IGNORED_FILES.has(e.name))
    .map((e) => path.join(BUNDLES_DIR, e.name));

  if (rootFiles.length > 0) {
    grouped.set('_other', rootFiles);
  }

  return grouped;
}

async function main(): Promise<void> {
  const isDryRun = process.argv.includes('--dry-run');

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
        const { bundle, resourceCount } = toTransactionBundle(file);
        totalResources += resourceCount;

        if (isDryRun) {
          console.log(`  [OK] ${relativePath} (${resourceCount} recurso${resourceCount === 1 ? '' : 's'})`);
          results.push({ file: relativePath, status: 'ok', resourceCount });
          continue;
        }

        // Subir el transaction bundle
        const response = await medplum.executeBatch(bundle);

        // Verificar respuestas individuales
        const errors = (response.entry ?? []).filter(
          (e: any) => {
            const status = e.response?.status;
            return status && !status.startsWith('2');
          }
        );

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
