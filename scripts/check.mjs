#!/usr/bin/env node
/**
 * M0 hygiene gate (post build+test): required files, schema, example YAML,
 * secret scan, ban Grok/DeepSeek as product title.
 */
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { parse as parseYaml } from 'yaml';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

function fail(m) {
  console.error(`[check] FAIL: ${m}`);
  process.exit(1);
}
function ok(m) {
  console.log(`[check] OK: ${m}`);
}

const required = [
  'LICENSE',
  'NOTICE',
  'README.md',
  'CONTRIBUTING.md',
  'SECURITY.md',
  'CHANGELOG.md',
  'CODE_OF_CONDUCT.md',
  'THIRD_PARTY_NOTICES.md',
  '.env.example',
  '.gitignore',
  '.gitattributes',
  'package.json',
  'config/quota-router.schema.json',
  'config/quota-router.example.yaml',
  'docs/assembly.md',
  'docs/boundaries.md',
  'docs/images/install-placeholder.svg',
  'docs/images/settings-plans-placeholder.svg',
  'src/index.ts',
  'src/types.ts',
  'src/select.ts',
  'dist/index.js',
  'scripts/health.mjs',
];
for (const rel of required) {
  if (!existsSync(join(root, rel))) fail(`missing ${rel}`);
}
ok('required files');

const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
if (pkg.name !== 'agent-quota-router') fail(`package.json name is ${pkg.name}`);
if (pkg.license !== 'MIT') fail('license must be MIT');
if (pkg.private !== true) fail('private must be true');
ok('package.json');

const schema = JSON.parse(readFileSync(join(root, 'config/quota-router.schema.json'), 'utf8'));
if (schema.title !== 'QuotaRouterConfig v0') fail('schema title mismatch');
for (const key of [
  'version',
  'enabled',
  'providers',
  'accounts',
  'pools',
  'plans',
  'defaultCooldownMs',
  'stayInPoolUnlessFallbackEnabled',
]) {
  if (!schema.required?.includes(key)) fail(`schema missing required ${key}`);
}
ok('schema parse');

const example = parseYaml(readFileSync(join(root, 'config/quota-router.example.yaml'), 'utf8'));
if (example.version !== 0) fail('example version');
if (example.defaultCooldownMs !== 60_000) fail('example defaultCooldownMs');
if (example.stayInPoolUnlessFallbackEnabled !== true) fail('example stayInPool');
const creds = (example.accounts ?? []).map((a) => a.credentialRef);
if (!creds.includes('cred_ref_demo_a')) fail('example missing cred_ref_demo_a');
if (JSON.stringify(example).match(/sk-[a-zA-Z0-9]{10,}/)) fail('example looks like it has a key');
ok('example yaml load');

const readme = readFileSync(join(root, 'README.md'), 'utf8');
const h1 = readme.split('\n').find((l) => l.startsWith('# '));
if (!h1) fail('README missing H1');
if (/\bGrok\b/i.test(h1) || /\bDeepSeek\b/i.test(h1)) {
  fail('product title (README H1) must not contain Grok or DeepSeek');
}
if (/\bGrok\b/i.test(pkg.name) || /\bDeepSeek\b/i.test(pkg.name)) {
  fail('package name must not contain Grok or DeepSeek');
}
const noticeFirst = readFileSync(join(root, 'NOTICE'), 'utf8').split('\n')[0] ?? '';
if (/\bGrok\b/i.test(noticeFirst) || /\bDeepSeek\b/i.test(noticeFirst)) {
  fail('NOTICE product line must not contain Grok or DeepSeek as title');
}
for (const needle of [
  'M0',
  '0.2.1-rc.5',
  'not affiliated',
  'cred_ref_demo_a',
  'docs/assembly.md',
  'stayInPoolUnlessFallbackEnabled',
]) {
  if (!readme.includes(needle)) fail(`README missing needle: ${needle}`);
}
ok('product title ban + README needles');

const assembly = readFileSync(join(root, 'docs/assembly.md'), 'utf8');
if (!assembly.includes('exactly ONE') && !/exactly one/i.test(assembly)) {
  fail('assembly.md must say exactly one resolve-wrap');
}
if (!assembly.includes('@omdp/dsh-key-fallback') || !assembly.includes('@goodandready/dsh-key-rotation')) {
  fail('assembly.md must name both wrap options');
}
if (!assembly.includes('Never both') && !/never both/i.test(assembly)) {
  fail('assembly.md must ban installing both wraps');
}
if (!assembly.includes('dsh-llm-fallbacks') || !assembly.includes('dsh-llm-retry')) {
  fail('assembly.md must mention llm-fallbacks and llm-retry');
}
if (!assembly.includes('mermaid')) fail('assembly.md missing mermaid');
ok('assembly.md');

const suspicious =
  /(?:sk-[a-zA-Z0-9]{20,}|BEGIN (?:RSA |OPENSSH )?PRIVATE KEY)/i;
function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    if (name === 'node_modules' || name === '.git' || name === 'dist') continue;
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) walk(p, out);
    else if (
      /\.(md|json|ya?ml|mjs|js|ts|css|html|svg|example|toml|txt)$/i.test(name) ||
      name === 'LICENSE' ||
      name === 'NOTICE'
    ) {
      out.push(p);
    }
  }
  return out;
}
for (const file of walk(root)) {
  const text = readFileSync(file, 'utf8');
  if (suspicious.test(text)) fail(`suspicious secret-like material in ${file}`);
}
ok('no obvious secrets (sk-/PRIVATE KEY)');

const health = spawnSync(process.execPath, [join(root, 'scripts/health.mjs'), '--dry'], {
  encoding: 'utf8',
  cwd: root,
});
if (health.status !== 0) {
  console.error(health.stdout);
  console.error(health.stderr);
  fail('health --dry failed');
}
ok('health --dry');

console.log('[check] all green');
