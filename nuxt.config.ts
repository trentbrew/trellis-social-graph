import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import tailwindcss from '@tailwindcss/vite';

/** Local fallback from `just db-init` — env vars win (Sprites / Vercel). */
function readLocalTrellisConfig(): { url?: string; apiKey?: string } {
  const path = resolve(process.cwd(), '.trellis-db.json');
  if (!existsSync(path)) return {};
  try {
    const cfg = JSON.parse(readFileSync(path, 'utf8')) as {
      url?: string;
      port?: number;
      apiKey?: string;
    };
    return {
      url: cfg.url ?? (cfg.port ? `http://127.0.0.1:${cfg.port}` : undefined),
      apiKey: cfg.apiKey,
    };
  } catch {
    return {};
  }
}

const localTrellis = readLocalTrellisConfig();

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  css: ['~/assets/css/tailwind.css'],

  ignore: [
    '**/.trellis-db/**',
  ],

  // Hit Trellis DB directly — Nuxt/Nitro does not reliably proxy WS upgrades
  // to /realtime (they fall through to Vue Router → 404 + EPIPE restarts).
  runtimeConfig: {
    public: {
      trellisUrl:
        process.env.NUXT_PUBLIC_TRELLIS_URL ??
        localTrellis.url ??
        'http://127.0.0.1:8230',
      /** Demo/public key — env, else `.trellis-db.json` (upload requires Bearer). */
      trellisApiKey:
        process.env.NUXT_PUBLIC_TRELLIS_API_KEY ?? localTrellis.apiKey ?? '',
    },
  },

  vite: {
    plugins: [tailwindcss()],
  },

  modules: [
    '@nuxtjs/color-mode',
    'motion-v/nuxt',
    '@vueuse/nuxt',
    '@nuxt/icon',
    '@nuxt/fonts',
    "@yuta-inoue-ph/nuxt-vcalendar",
    "@vee-validate/nuxt"
  ],

  imports: {
    imports: [
      {
        from: 'tailwind-variants',
        name: 'tv',
      },
      {
        from: 'tailwind-variants',
        name: 'VariantProps',
        type: true,
      },
    ],
  },

  colorMode: {
    storageKey: 'trellis-social-color-mode',
    classSuffix: '',
  },

  icon: {
    clientBundle: {
      scan: true,
      sizeLimitKb: 0,
    },
    mode: 'svg',
    class: 'shrink-0',
    fetchTimeout: 2000,
    serverBundle: 'local',
  },

  app: {
    head: {},
  },
});