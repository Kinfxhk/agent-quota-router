#!/usr/bin/env node
/**
 * Dry health: load schema + example YAML; no network; no secrets.
 */
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse as parseYaml } from 'yaml';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const dry = process.argv.includes('--dry');

function fail(m) {
  console.error(`[health] FAIL: ${m}`);
  process.exit(1);
}

const schemaPath = join(root, 'config/quota-router.schema.json');
const examplePath = join(root, 'config/quota-router.example.yaml');
if (!existsSync(schemaPath) || !existsSync(examplePath)) fail('missing schema or example');

JSON.parse(readFileSync(schemaPath, 'utf8'));
const doc = parseYaml(readFileSync(examplePath, 'utf8'));
if (doc?.version !== 0) fail('example version must be 0');
if (doc?.defaultCooldownMs !== 60_000) fail('example defaultCooldownMs must be 60000');
if (doc?.stayInPoolUnlessFallbackEnabled !== true) fail('stayInPoolUnlessFallbackEnabled must be true in example');
const refs = (doc.accounts ?? []).map((a) => a.credentialRef);
if (!refs.includes('cred_ref_demo_a')) fail('example must include cred_ref_demo_a');

console.log(`[health] OK schema+example${dry ? ' (dry)' : ''}`);
console.log(`[health] accounts=${(doc.accounts ?? []).length} pools=${(doc.pools ?? []).length} plans=${(doc.plans ?? []).length}`);
