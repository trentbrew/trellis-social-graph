import { TrellisDb } from 'trellis/client/sdk';

export type CreateClientOptions = {
  url: string;
  apiKey?: string;
};

/** Browser / remote client — talks to `trellis db serve` (CORS on when apiKey set). */
export function createClient(opts: CreateClientOptions | string): TrellisDb {
  if (typeof opts === 'string') {
    return new TrellisDb({ url: opts });
  }
  return new TrellisDb({
    url: opts.url,
    ...(opts.apiKey ? { apiKey: opts.apiKey } : {}),
  });
}
