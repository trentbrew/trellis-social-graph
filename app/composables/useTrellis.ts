import type { TrellisDb } from 'trellis/client/sdk';

/** Typed access to the Trellis client provided by `trellis.client.ts`. */
export function useTrellis(): TrellisDb {
  const { $trellis } = useNuxtApp();
  if (!$trellis) {
    throw new Error(
      'Trellis client missing — is the trellis.client plugin registered?',
    );
  }
  return $trellis;
}
