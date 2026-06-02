#!/bin/sh
set -e

echo "▶ Running database migrations..."
# export NODE_ENV=production
pnpm medusa db:migrate

# Allow running arbitrary commands (e.g. docker compose run medusa pnpm medusa user -e admin@example.com -p password)
if [ $# -gt 0 ]; then
  exec "$@"
fi

# Optional: Only seed if the database hasn't been seeded yet
# We check for a hidden file in the 'data' volume
if [ ! -f "/var/lib/medusa/seeded.txt" ]; then
    echo "▶ Seeding database for the first time..."
    pnpm seed && touch /var/lib/medusa/seeded.txt || echo "⚠ Seed failed."
    # Create an initial admin user (Environment variables are safer than hardcoding)
    if [ -n "$ADMIN_EMAIL" ] && [ -n "$ADMIN_PASSWORD" ]; then
        echo "▶ Creating admin user..."
        npx medusa user -e "$ADMIN_EMAIL" -p "$ADMIN_PASSWORD" || echo "Admin already exists."
    fi
else
    echo "▶ Skipping seed (already initialized)."
fi

echo "▶ Starting Medusa production server..."
exec pnpm start
