#!/usr/bin/env node
/**
 * Sprites room-node deploy — mirrors fractal-playground `smoke:deploy`.
 * Writes/updates `.trellis-db.json` with remote `url` + `apiKey`.
 *
 *   pnpm run smoke:deploy -- trellis-social
 *   TRELLIS_NODE_ROOT=/path/to/trellis-node pnpm run smoke:deploy -- trellis-social
 */
import { spawn } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const configPath = resolve(root, '.trellis-db.json');

const positional = process.argv
  .slice(2)
  .filter((arg) => arg !== '--stub' && arg !== '--');
const name = positional[0] ?? `trellis-social-${Date.now().toString(36).slice(-6)}`;
const stub = process.argv.includes('--stub');

const trellisNode = resolve(
  process.env.TRELLIS_NODE_ROOT ??
    resolve(root, '../../../TRELLIS/trellis-node'),
);

async function runTrellisDeploy() {
  if (!existsSync(resolve(trellisNode, 'package.json'))) {
    throw new Error(
      `trellis-node not found at ${trellisNode}. Set TRELLIS_NODE_ROOT.`,
    );
  }

  const args = [
    'tsx',
    'src/cli/index.ts',
    'deploy',
    '--name',
    name,
    '--config-dir',
    root,
  ];
  if (stub) args.push('--stub');

  return new Promise((resolvePromise, reject) => {
    const child = spawn('npx', args, {
      cwd: trellisNode,
      stdio: 'inherit',
      env: { ...process.env, TRELLIS_NODE_ROOT: trellisNode },
    });
    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) resolvePromise();
      else reject(new Error(`trellis deploy exited ${code}`));
    });
  });
}

async function healthCheck(url) {
  const res = await fetch(`${url.replace(/\/$/, '')}/health`);
  const text = await res.text();
  console.log(`Health ${res.status}: ${text}`);
  if (!res.ok) throw new Error(`Health check failed: ${res.status}`);
}

async function main() {
  console.log(`Smoke deploy: name=${name} stub=${stub}`);
  console.log(`Trellis source: ${trellisNode}`);

  await runTrellisDeploy();

  if (!existsSync(configPath)) {
    throw new Error(`Missing ${configPath}`);
  }

  const config = JSON.parse(readFileSync(configPath, 'utf8'));
  console.log('Config written:', {
    url: config.url,
    spriteName: config.spriteName,
    mode: config.mode,
  });

  if (!stub && config.url) {
    await healthCheck(config.url);
  }

  console.log(`
Next:
  1. Set Vercel env NUXT_PUBLIC_TRELLIS_URL=${config.url ?? '<sprites-url>'}
  2. Set Vercel env NUXT_PUBLIC_TRELLIS_API_KEY=<apiKey from .trellis-db.json>
  3. vercel --prod
  4. NUXT_PUBLIC_TRELLIS_URL=… pnpm run import:posts
`);
  console.log('Smoke deploy OK');
}

main().catch((err) => {
  console.error('Smoke deploy failed:', err.message ?? err);
  process.exit(1);
});
