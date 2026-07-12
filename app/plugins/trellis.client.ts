import { SOCIAL_TYPES } from '~/lib/schemas/social';
import { createClient } from '~/lib/trellis';

/**
 * Register schemas only (idempotent). Never seed entities from the browser —
 * N tabs would race. Seed via CLI against `db serve`.
 */
export default defineNuxtPlugin(async () => {
  const config = useRuntimeConfig();
  const client = createClient({
    url: config.public.trellisUrl,
    ...(config.public.trellisApiKey
      ? { apiKey: config.public.trellisApiKey }
      : {}),
  });

  try {
    for (const type of SOCIAL_TYPES) {
      await client.registerType(type);
    }
  } catch (err) {
    console.error(
      '[trellis] registerType failed — is `trellis db serve` up?',
      err,
    );
  }

  return {
    provide: {
      trellis: client,
    },
  };
});
