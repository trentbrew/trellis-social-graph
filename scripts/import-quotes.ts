/**
 * Reference import script — adapts CSV data to the social graph schema.
 * Originally written for blackwords.co; kept as a working example of how to
 * seed entities via HTTP against a running `trellis db serve`.
 *
 * Seeds over HTTP against a running `trellis db serve` (realtime-app
 * `trellis-seed.mjs` pattern). Stable IDs via POST body `id` (SDK create in
 * 3.2.x does not forward options.id).
 *
 *   just db            # required first
 *   just import-quotes
 */
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from 'csv-parse/sync';
import { TrellisDb } from 'trellis/client/sdk';
import { SOCIAL_TYPES } from '../app/lib/schemas/social';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const CONFIG_PATH = resolve(ROOT, '.trellis-db.json');

// Find the seed CSV (it might be in .local/quote-seed.csv or the root directory)
let csvPath = resolve(ROOT, '.local/quote-seed.csv');
if (!existsSync(csvPath)) {
  csvPath = resolve(ROOT, 'Blackwords.co Database - Quotes.csv');
}
const CSV_PATH = csvPath;

type TrellisConfig = {
  mode?: string;
  dbPath?: string;
  port?: number;
  url?: string;
  apiKey?: string;
};

type CsvRow = {
  Author: string;
  'Profession (comma separated)': string;
  Quote: string;
  'Tags (comma separated)': string;
  LIVE: string;
};

function readConfig(): TrellisConfig {
  if (!existsSync(CONFIG_PATH)) {
    console.error(
      'Missing .trellis-db.json — run `just db` (trellis db init) first.',
    );
    process.exit(1);
  }
  return JSON.parse(readFileSync(CONFIG_PATH, 'utf8')) as TrellisConfig;
}

function slugify(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

function splitList(raw: string | undefined): string[] {
  if (!raw?.trim()) return [];
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

function quoteId(author: string, text: string): string {
  const hash = createHash('sha256')
    .update(`${author}\n${text}`)
    .digest('hex')
    .slice(0, 16);
  return `quote:${slugify(author) || 'anon'}:${hash}`;
}

function personId(name: string): string {
  return `person:${slugify(name)}`;
}

function tagId(label: string): string {
  return `tag:${slugify(label)}`;
}

function baseUrl(config: TrellisConfig): string {
  return (
    process.env.NUXT_PUBLIC_TRELLIS_URL ??
    config.url ??
    `http://127.0.0.1:${config.port ?? 8230}`
  );
}

function apiKey(config: TrellisConfig): string | undefined {
  return (
    process.env.NUXT_PUBLIC_TRELLIS_API_KEY ??
    process.env.TRELLIS_API_KEY ??
    config.apiKey
  );
}

async function api(
  config: TrellisConfig,
  method: string,
  path: string,
  body?: unknown,
): Promise<Record<string, unknown>> {
  const url = `${baseUrl(config)}${path}`;
  const res = await fetch(url, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(apiKey(config) ? { Authorization: `Bearer ${apiKey(config)}` } : {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) {
    const msg =
      typeof data.message === 'string'
        ? data.message
        : typeof data.error === 'string'
          ? data.error
          : res.statusText;
    const err = new Error(`HTTP ${res.status}: ${msg}`) as Error & {
      status: number;
    };
    err.status = res.status;
    throw err;
  }
  return data;
}

async function withRetry<T>(
  label: string,
  fn: () => Promise<T>,
  attempts = 4,
): Promise<T> {
  let last: unknown;
  for (let i = 1; i <= attempts; i++) {
    try {
      return await fn();
    } catch (err) {
      last = err;
      const status = (err as { status?: number }).status;
      const msg = err instanceof Error ? err.message : String(err);
      const retryable =
        status === 500 ||
        status === 502 ||
        status === 503 ||
        /Statement closed|ECONNRESET|timeout|fetch failed/i.test(msg);
      if (!retryable || i === attempts) throw err;
      const delay = 250 * i;
      console.warn(`retry ${i}/${attempts} ${label}: ${msg} (wait ${delay}ms)`);
      await new Promise((r) => setTimeout(r, delay));
    }
  }
  throw last;
}

async function ensureExists(
  config: TrellisConfig,
  type: string,
  id: string,
  attributes: Record<string, unknown>,
): Promise<'created' | 'exists'> {
  return withRetry(`ensure ${id}`, async () => {
    try {
      await api(config, 'GET', `/entities/${encodeURIComponent(id)}`);
      return 'exists';
    } catch (err) {
      if ((err as { status?: number }).status !== 404) throw err;
    }

    try {
      await api(config, 'POST', '/entities', { id, type, attributes });
      return 'created';
    } catch (err) {
      if ((err as { status?: number }).status === 409) return 'exists';
      throw err;
    }
  });
}

async function assertServerUp(config: TrellisConfig): Promise<void> {
  const url = baseUrl(config);
  try {
    const res = await fetch(`${url}/health`, {
      // Cold Sprites wake can exceed a few seconds.
      signal: AbortSignal.timeout(60_000),
    });
    if (!res.ok) throw new Error(`health returned ${res.status}`);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(
      `Trellis DB not reachable at ${url} (${msg}).\n` +
        'Start it first: `just db` / `just deploy-db`, or check NUXT_PUBLIC_TRELLIS_URL.',
    );
    process.exit(1);
  }
}

async function main() {
  const config = readConfig();
  await assertServerUp(config);

  const url = baseUrl(config);
  const raw = readFileSync(CSV_PATH, 'utf8');
  const rows = parse(raw, {
    columns: true,
    skip_empty_lines: true,
    relax_quotes: true,
    trim: true,
  }) as CsvRow[];

  console.log(`CSV rows: ${rows.length}`);
  console.log(`Trellis:  remote ${url}`);

  // registerType via SDK (409-safe); entity writes via raw HTTP for stable ids
  const client = new TrellisDb({
    url,
    ...(apiKey(config) ? { apiKey: apiKey(config) } : {}),
  });
  for (const type of SOCIAL_TYPES) {
    await client.registerType(type);
    console.log(`registered ${type.type}`);
  }

  const stats = {
    peopleCreated: 0,
    peopleExists: 0,
    tagsCreated: 0,
    tagsExists: 0,
    quotesCreated: 0,
    quotesExists: 0,
    skipped: 0,
  };

  const personCache = new Map<string, string>();
  const tagCache = new Map<string, string>();

  for (const [i, row] of rows.entries()) {
    const author = (row.Author ?? '').trim();
    const text = (row.Quote ?? '').trim();
    if (!author || !text) {
      stats.skipped++;
      continue;
    }

    const professions = splitList(row['Profession (comma separated)']);
    const tagLabels = splitList(row['Tags (comma separated)']);
    const live = String(row.LIVE ?? '')
      .trim()
      .toLowerCase();
    const isLive = live === 'true' || live === '1' || live === 'yes';

    let pId = personCache.get(author);
    if (!pId) {
      pId = personId(author);
      const status = await ensureExists(config, 'Person', pId, {
        name: author,
        professions: professions.join(', '),
      });
      if (status === 'created') stats.peopleCreated++;
      else stats.peopleExists++;
      personCache.set(author, pId);
    }

    const tagIds: string[] = [];
    for (const label of tagLabels) {
      let tId = tagCache.get(label);
      if (!tId) {
        tId = tagId(label);
        const status = await ensureExists(config, 'Tag', tId, { label });
        if (status === 'created') stats.tagsCreated++;
        else stats.tagsExists++;
        tagCache.set(label, tId);
      }
      tagIds.push(tId);
    }

    const qId = quoteId(author, text);
    const status = await ensureExists(config, 'Quote', qId, {
      text,
      live: isLive,
      author: pId,
      tags: tagIds,
    });
    if (status === 'created') stats.quotesCreated++;
    else stats.quotesExists++;

    if ((i + 1) % 100 === 0) {
      console.log(`… ${i + 1}/${rows.length}`);
    }
  }

  console.log('\nDone.');
  console.log(stats);
  console.log(
    `people≈${personCache.size}  tags≈${tagCache.size}  quotes created=${stats.quotesCreated}`,
  );

  client.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
