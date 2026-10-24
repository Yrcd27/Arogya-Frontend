import { build } from 'esbuild';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const testsDir = join(root, 'tests');
const entries = readdirSync(testsDir).filter(name => name.endsWith('.test.ts')).map(name => join(testsDir, name));
const outDir = mkdtempSync(join(tmpdir(), 'arogya-tests-'));

try {
  await build({
    entryPoints: entries,
    outdir: outDir,
    bundle: true,
    platform: 'node',
    format: 'cjs',
    outExtension: { '.js': '.cjs' },
    define: { 'import.meta.env': '{"DEV":true}' },
    logLevel: 'error',
  });
  const files = readdirSync(outDir).filter(name => name.endsWith('.cjs')).map(name => join(outDir, name));
  const result = spawnSync(process.execPath, ['--test', ...files], { stdio: 'inherit' });
  process.exitCode = result.status ?? 1;
} finally {
  rmSync(outDir, { recursive: true, force: true });
}
