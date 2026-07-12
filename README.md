# trellis-social-nuxt

A starter template for building social apps on the [Trellis](https://github.com/trentbrew/trellis) graph. Comes with a working social feed demo — posts, people, and tags linked together in a typed knowledge graph.

## Stack

- [Nuxt](https://nuxt.com/) + Vue 3
- [UI Thing](https://uithing.com/) (shadcn-style Nuxt components)
- [Trellis](https://github.com/trentbrew/trellis) typed graph (`defineType` + `trellis/vue/typed`)

The browser talks directly to the Trellis room node (local `:8230` or a Sprites
`*.sprites.app` URL). Nuxt's WebSocket proxy is unreliable for `/realtime`, so
the sidecar URL stays explicit via `NUXT_PUBLIC_TRELLIS_URL`.

## Start (local)

```bash
just run            # Trellis DB + Nuxt concurrently
just db             # Trellis DB only (:8230) — desk-local trellis-node
just import-posts   # seed data → graph (DB must be running)
just web            # Nuxt only
just ui button      # add UI Thing components
```

Dev server: http://localhost:1979

Local `just db` uses desk-local `trellis-node` (not npm `trellis`) so
`POST /entities` honors client-supplied IDs when iterating on the kernel. The
app depends on npm `trellis@^3.2.5` for the client SDK (Vercel-safe).

### Graph model

```
Person ←author— Post —tags→ Tag[]
```

Schemas live in `app/lib/schemas/social.ts`. The client plugin only
`registerType`s; entity seed is CLI-only so multiple browser tabs cannot race.

## Hosted (Sprites + Vercel)

Two-tier model: **Sprites room node** (API) + **Vercel** (Nuxt app).

```bash
# 1. Deploy room node (writes remote url + apiKey into .trellis-db.json)
just deploy-db trellis-social
# or: pnpm run smoke:deploy -- trellis-social

# 2. Set Vercel env (from .trellis-db.json)
#    NUXT_PUBLIC_TRELLIS_URL=https://….sprites.app
#    NUXT_PUBLIC_TRELLIS_API_KEY=spk_…

# 3. Link + deploy UI
vercel link
vercel --prod

# 4. Seed remote graph
NUXT_PUBLIC_TRELLIS_URL=… NUXT_PUBLIC_TRELLIS_API_KEY=… just import-posts
```

See `.env.example`. The `*.sprites.app` URL is **API only** — not the Nuxt UI.

## Customizing

1. Edit `app/lib/schemas/social.ts` to define your own entity types
2. Update the plugin at `app/plugins/trellis.client.ts` to register them
3. Build your UI in `app/components/` — the `SocialFeed` component is a working reference
4. Run `just ui <component>` to scaffold UI Thing components as needed
