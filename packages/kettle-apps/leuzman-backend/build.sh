#!/bin/sh
# Run LOCALLY before deploying. Builds everything and installs prod deps so
# Docker on the VPS only copies files — no pnpm install, no OOM.
#
# Deploy:
#   ./build.sh
#   rsync -az --delete \
#     --exclude='.git' --exclude='.env' \
#     ./ user@your-vps:/srv/leuzman-backend/
#   ssh user@your-vps "cd /srv/leuzman-backend && docker compose build --no-cache && docker compose up -d"
# ──────────────────────────────────────────────────────────────────────────────
set -e

echo "▶ Building medusa-qr..."
(cd medusa-qr && pnpm build)

echo "▶ Building medusa-product-ext..."
(cd medusa-product-ext && pnpm build)

echo "▶ Building medusa-stories..."
(cd medusa-stories && pnpm build)

echo "▶ Building main Medusa server..."
pnpm build

echo "▶ Installing production node_modules locally..."
# --prod             : skip devDependencies
# --shamefully-hoist : flat node_modules so Docker COPY works cleanly
pnpm install --prod --shamefully-hoist

echo ""
echo "✓ Ready. Sync to VPS with rsync then run docker compose build."
