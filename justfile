# trellis-social-nuxt — local recipes
# Local stack: `just run` (db :8230 + Nuxt :1979)
# Sidecar uses desk-local trellis-node (not npm `trellis`) so POST /entities
# honors client-supplied IDs. Client SDK is npm `trellis@^3.2` (Vercel-safe).
set dotenv-load := false
set shell := ["bash", "-cu"]

port := "1979"
db_port := "8230"
trellis-node := env_var_or_default("TRELLIS_NODE_ROOT", "../../../trellis-node")
trellis-cli := trellis-node + "/bin/trellis.mjs"

default:
    @just --list

# Trellis DB + Nuxt concurrently
run:
    pnpm run dev:all

# Alias for run
start: run

# Alias for run
dev: run

# Nuxt only (expects DB on :{{db_port}})
web:
    pnpm exec nuxt dev --port {{port}} --host 127.0.0.1

# One-time: writes .trellis-db.json + .trellis-db/ (port {{db_port}})
db-init:
    bun {{trellis-cli}} db init --port {{db_port}}

# Foreground Trellis DB HTTP + WebSocket (desk-local trellis-node)
db:
    #!/usr/bin/env bash
    set -euo pipefail
    if [[ ! -f .trellis-db.json ]]; then
      just db-init
    fi
    TRELLIS_BACKEND="${TRELLIS_BACKEND:-sqljs}" bun {{trellis-cli}} db serve -p {{db_port}}

# Seed data → graph (requires `just db` or remote URL)
import-posts:
    pnpm run import:posts

# Seed sample posts → graph (requires `just db`)
seed:
    pnpm run seed:posts

# Deploy room node to Sprites (writes remote url + apiKey into .trellis-db.json)
deploy-db name="trellis-social":
    pnpm run smoke:deploy -- {{name}}

# Production build
build:
    pnpm run build

# Preview production build
preview:
    pnpm run preview

# Install deps + prepare Nuxt
install:
    pnpm install

# Clear stale Nuxt/Vite caches (fixes #app-manifest resolve errors)
clean:
    rm -rf .nuxt node_modules/.cache/vite
    pnpm exec nuxt prepare

# Add a UI Thing component (e.g. `just ui button input`)
ui +components:
    pnpm exec ui-thing add {{components}}
