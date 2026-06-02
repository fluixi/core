#!/bin/sh
set -e
echo "▶ Running database migrations..."
echo "▶ Installing deps..."
cp /server/.env.dev /server/.env
pnpm install --config.confirmModulesPurge=false
echo "▶ Install done..."
cd /server/medusa-product-ext && pnpm install --filter medusa-product-ext --config.confirmModulesPurge=false && pnpm run build && cd ..
cd /server/medusa-qr && pnpm install --filter medusa-qr --config.confirmModulesPurge=false && pnpm run build && cd ..
cd /server/medusa-stories && pnpm install --filter medusa-stories --config.confirmModulesPurge=false && pnpm run build && cd ..
cd /server/medusa-social-commerce && pnpm install --filter medusa-social-commerce --config.confirmModulesPurge=false && pnpm run build && cd ..
cd /server/medusa-odoo && pnpm install --filter medusa-odoo --config.confirmModulesPurge=false && pnpm run build && cd ..

pnpm medusa db:generate Qr ProductExt SocialCommerce Story odooSync barcode
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
        echo "▶ Admin user created."
    fi
else
    echo "▶ Skipping seed (already initialized)."
fi
if [ ! -f "/var/lib/medusa/seeded_categories.txt" ]; then
    echo "▶ Seeding database for the first time..."
    pnpm seed:categories && touch /var/lib/medusa/seeded_categories.txt || echo "⚠ Seed categories failed."
else
    echo "▶ Skipping seed categories (already initialized)."
fi

if [ ! -f "/var/lib/medusa/seeded_products.txt" ]; then
    echo "▶ Seeding database for the first time..."
    pnpm seed:products && touch /var/lib/medusa/seeded_products.txt || echo "⚠ Seed products failed."
else
    echo "▶ Skipping seed products (already initialized)."
fi

if [ ! -f "/var/lib/medusa/seeded_admin.txt" ]; then
    echo "▶ Seeding admin database for the first time..."
    # Create an initial admin user (Environment variables are safer than hardcoding)
    if [ -n "$ADMIN_EMAIL" ]; then
        echo "▶ Assigning superadmin role."
        EMAIL="$ADMIN_EMAIL" pnpm medusa exec ./src/scripts/assign-superadmin.ts && touch /var/lib/medusa/seeded_admin.txt || echo "⚠ Assigning superadmin role failed."
    fi
else
    echo "▶ Skipping admin seed (User role already initialized)."
fi




echo "▶ Starting Medusa production server..."
# exec pnpm dev
exec pnpm start
