import tailwindcss from '@tailwindcss/vite';

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
        process.env.NUXT_PUBLIC_TRELLIS_URL ?? 'http://127.0.0.1:8230',
      /** Demo/public key only — same pattern as fractal-playground. */
      trellisApiKey: process.env.NUXT_PUBLIC_TRELLIS_API_KEY ?? '',
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