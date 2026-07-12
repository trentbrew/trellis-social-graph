/**
 * Seed script — creates Person, Tag, and Post entities for the social feed.
 * Run against a running `trellis db serve` (port 8230 by default).
 *
 *   just db            # required first
 *   pnpm run seed:posts
 */
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { TrellisDb } from 'trellis/client/sdk';
import { SOCIAL_TYPES } from '../app/lib/schemas/social';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const CONFIG_PATH = resolve(ROOT, '.trellis-db.json');

type TrellisConfig = {
  mode?: string;
  dbPath?: string;
  port?: number;
  url?: string;
  apiKey?: string;
};

function readConfig(): TrellisConfig {
  if (!existsSync(CONFIG_PATH)) {
    console.error('Missing .trellis-db.json — run `just db` first.');
    process.exit(1);
  }
  return JSON.parse(readFileSync(CONFIG_PATH, 'utf8')) as TrellisConfig;
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
    const err = new Error(`HTTP ${res.status}: ${msg}`);
    throw err;
  }
  return data;
}

async function ensureEntity(
  config: TrellisConfig,
  type: string,
  id: string,
  attributes: Record<string, unknown>,
): Promise<'created' | 'exists'> {
  try {
    await api(config, 'GET', `/entities/${encodeURIComponent(id)}`);
    return 'exists';
  } catch {
    // not found — create
  }
  try {
    await api(config, 'POST', '/entities', { id, type, attributes });
    return 'created';
  } catch (err) {
    if ((err as { status?: number }).status === 409) return 'exists';
    throw err;
  }
}

// --- Seed Data ---

const people = [
  { id: 'person:trent', name: 'Trent', bio: 'Building Trellis. Craftpunk.' },
  { id: 'person:ada', name: 'Ada', bio: 'Distributed systems enthusiast.' },
  { id: 'person:linus', name: 'Linus', bio: 'Kernel hacker, open source advocate.' },
  { id: 'person:grace', name: 'Grace', bio: 'Compiler engineer, PL nerd.' },
  { id: 'person:brian', name: 'Brian', bio: 'The network is the computer.' },
];

const tags = [
  { id: 'tag:craftpunk', label: 'craftpunk' },
  { id: 'tag:local-first', label: 'local-first' },
  { id: 'tag:graphs', label: 'graphs' },
  { id: 'tag:rust', label: 'rust' },
  { id: 'tag:web', label: 'web' },
  { id: 'tag:oss', label: 'oss' },
  { id: 'tag:dev-tools', label: 'dev-tools' },
  { id: 'tag:systems', label: 'systems' },
];

const posts = [
  {
    id: 'post:seed-1',
    content:
      'The best interface is the one that stays out of your way. Local-first software remembers that the user is in control.',
    author: 'person:trent',
    tags: ['tag:craftpunk', 'tag:local-first'],
    likes: 12,
    reposts: 3,
  },
  {
    id: 'post:seed-2',
    content:
      'Graphs are the natural data structure for social software. Entities, attributes, links — everything connects.',
    author: 'person:ada',
    tags: ['tag:graphs', 'tag:local-first'],
    likes: 8,
    reposts: 1,
  },
  {
    id: 'post:seed-3',
    content:
      'Shipped a new version of the Trellis schema engine today. Zod + EAV = surprisingly pleasant DX.',
    author: 'person:trent',
    tags: ['tag:rust', 'tag:dev-tools'],
    likes: 15,
    reposts: 5,
  },
  {
    id: 'post:seed-4',
    content:
      'The web platform is underrated. You don\'t always need a framework — sometimes a well-structured HTML file is enough.',
    author: 'person:brian',
    tags: ['tag:web', 'tag:oss'],
    likes: 6,
    reposts: 2,
  },
  {
    id: 'post:seed-5',
    content:
      'Type systems are a love letter to future-you. Schema validation at the boundary, inference everywhere else.',
    author: 'person:grace',
    tags: ['tag:dev-tools', 'tag:systems'],
    likes: 20,
    reposts: 7,
  },
  {
    id: 'post:seed-6',
    content:
      'Open source is not a business model. It\'s a collaboration model. The business model is what you build on top.',
    author: 'person:linus',
    tags: ['tag:oss', 'tag:systems'],
    likes: 25,
    reposts: 10,
  },
  {
    id: 'post:seed-7',
    content:
      'Tried running my entire stack offline for a week. Turns out most of it works better without the network.',
    author: 'person:trent',
    tags: ['tag:local-first', 'tag:craftpunk'],
    likes: 18,
    reposts: 4,
  },
  {
    id: 'post:seed-8',
    content:
      'A knowledge graph is just a database that respects the shape of thought. Nodes are ideas, edges are relationships.',
    author: 'person:ada',
    tags: ['tag:graphs', 'tag:dev-tools'],
    likes: 11,
    reposts: 2,
  },
  {
    id: 'post:seed-9',
    content:
      'Compilers are just really fancy translators. The hard part isn\'t the translation — it\'s knowing what to say.',
    author: 'person:grace',
    tags: ['tag:systems', 'tag:rust'],
    likes: 14,
    reposts: 3,
  },
  {
    id: 'post:seed-10',
    content:
      'Every great tool started as a scratch for someone\'s own itch. The trick is building the itch-scratcher in public.',
    author: 'person:brian',
    tags: ['tag:oss', 'tag:craftpunk'],
    likes: 9,
    reposts: 1,
  },
  {
    id: 'post:seed-11',
    content:
      'Sync is the hard problem. CRDTs make it tractable, but the UX around conflict resolution is where the real work happens.',
    author: 'person:linus',
    tags: ['tag:local-first', 'tag:systems'],
    likes: 22,
    reposts: 6,
  },
  {
    id: 'post:seed-12',
    content:
      'Just deployed a Trellis room node. Two commands, ten seconds, zero cloud dependency. This is how it should work.',
    author: 'person:trent',
    tags: ['tag:local-first', 'tag:dev-tools'],
    likes: 16,
    reposts: 4,
  },
];

async function main() {
  const config = readConfig();
  const url = baseUrl(config);
  console.log(`Trellis: ${url}`);

  const client = new TrellisDb({
    url,
    ...(apiKey(config) ? { apiKey: apiKey(config) } : {}),
  });

  for (const type of SOCIAL_TYPES) {
    await client.registerType(type);
    console.log(`registered ${type.type}`);
  }

  let peopleCreated = 0;
  let tagsCreated = 0;
  let postsCreated = 0;

  for (const p of people) {
    const s = await ensureEntity(config, 'Person', p.id, {
      name: p.name,
      bio: p.bio,
    });
    if (s === 'created') peopleCreated++;
  }
  console.log(`people: ${peopleCreated} created, ${people.length - peopleCreated} existing`);

  for (const t of tags) {
    const s = await ensureEntity(config, 'Tag', t.id, { label: t.label });
    if (s === 'created') tagsCreated++;
  }
  console.log(`tags: ${tagsCreated} created, ${tags.length - tagsCreated} existing`);

  for (const p of posts) {
    const s = await ensureEntity(config, 'Post', p.id, {
      content: p.content,
      published: true,
      likes: p.likes,
      reposts: p.reposts,
      author: p.author,
      tags: p.tags,
    });
    if (s === 'created') postsCreated++;
  }
  console.log(`posts: ${postsCreated} created, ${posts.length - postsCreated} existing`);

  console.log('\nDone.');
  client.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
