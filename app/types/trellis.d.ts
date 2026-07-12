import type { TrellisDb } from 'trellis/client/sdk';

declare module '#app' {
  interface NuxtApp {
    $trellis: TrellisDb;
  }
}

declare module 'vue' {
  interface ComponentCustomProperties {
    $trellis: TrellisDb;
  }
}

declare module 'nuxt/schema' {
  interface PublicRuntimeConfig {
    /** Base URL of `trellis db serve` / Sprites room node (direct; Nuxt WS proxy is unreliable). */
    trellisUrl: string;
    /** Public demo API key for remote room nodes (CORS + Bearer). */
    trellisApiKey: string;
  }
}

export {};
