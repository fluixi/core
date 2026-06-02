import { loadEnv, defineConfig, Modules } from '@medusajs/framework/utils';

const env = process.env.NODE_ENV || 'development'
loadEnv(env, process.cwd());


module.exports = defineConfig({
  projectConfig: {
    databaseUrl: process.env.DATABASE_URL,
    redisUrl: process.env.REDIS_URL,
    http: {
      /**
       * CORS origins allowed:
       *   - Storefront    (http://localhost:3003)
       *   - Store Admin   (http://localhost:3004)
       *   - Medusa Admin  (http://localhost:9000 / :5173 during dev)
       */
      storeCors: process.env.STORE_CORS!,
      adminCors: process.env.ADMIN_CORS!,
      authCors: process.env.AUTH_CORS!,
      jwtSecret: process.env.JWT_SECRET || 'supersecret',
      cookieSecret: process.env.COOKIE_SECRET || 'supersecret',
    },
    databaseDriverOptions: {
      ssl: false,
      sslmode: 'disable',
      connection: {
        ssl: false,
      },
    },
  },

  plugins: [
    {
      resolve: `medusa-odoo`,
      options: {
        odoo_url:         process.env.ODOO_URL!,
        odoo_db:          process.env.ODOO_DB!,
        odoo_username:    process.env.ODOO_USERNAME!,
        odoo_password:    process.env.ODOO_PASSWORD!,
        odoo_timeout:     Number(process.env.ODOO_TIMEOUT  ?? 30_000),
        odoo_rate_limit:  Number(process.env.ODOO_RATE_LIMIT ?? 20),
        redis_url:        process.env.REDIS_URL,
        webhook_secret:   process.env.ODOO_WEBHOOK_SECRET,
        sync_products:    true,
        sync_inventory:   true,
        sync_orders:      true,
        sync_customers:   true,
      },
    },
    {
      resolve: `medusa-qr`,
      options: {
        name: 'Medusa qrcode',
      },
    },
    {
      resolve: `medusa-stories`,
      options: {
        name: 'Medusa stories',
      },
    },
    {
      resolve: `medusa-product-ext`,
      options: {
        name: 'Medusa product ext',
      },
    },
    {
      resolve: `medusa-barcode`,
      options: {
        providerConfig: {
          openFoodFacts: {
            enabled:  true,
            country:  'world',
            timeout:  12_000,
            retries:  2,
            priority: 10,
          },
          upcItemDb: {
            enabled:  true,
            apiKey:   process.env.UPCITEMDB_API_KEY,   // omit for free trial tier
            timeout:  10_000,
            retries:  2,
            priority: 20,
          },
        },
        cache: {
          ttl: Number(process.env.BARCODE_CACHE_TTL ?? 86_400), // 24 h
        },
      },
    },
    {
      resolve: `medusa-social-commerce`,
      options: {
        tiktok_client_key:        process.env.TIKTOK_CLIENT_KEY,
        tiktok_client_secret:     process.env.TIKTOK_CLIENT_SECRET,
        tiktok_redirect_uri:      process.env.TIKTOK_REDIRECT_URI,
        tiktok_state_secret:      process.env.TIKTOK_STATE_SECRET,
        tiktok_scopes:            process.env.TIKTOK_SCOPES ?? 'user.info.basic,video.list,live.room.status.query',
        encryption_key:           process.env.SC_ENCRYPTION_KEY,
        redis_url:                process.env.REDIS_URL,
        reservation_ttl_seconds:  300,
      },
    },
  ],
  admin: {
    disable: true,
    vite: () => ({
      server: {
        host: '0.0.0.0',
        allowedHosts: ['localhost', '.localhost', '127.0.0.1', '*'],
        fs: {
          strict: false,
          allow: [
            process.cwd(), // local dev
            '/server', // Docker
          ],
        },
        hmr: { port: 5173, clientPort: 5173 },
      },
      optimizeDeps: {
        force: true,
      },
      cacheDir: `${process.cwd()}/node_modules/.vite`,
    }),
  },

  /**
   * Built-in Medusa modules are auto-loaded.
   * Add third-party payment / fulfillment providers here.
   * Example (Stripe):
   *   [Modules.PAYMENT]: {
   *     providers: [{
   *       resolve: '@medusajs/payment-stripe',
   *       id: 'stripe',
   *       options: { apiKey: process.env.STRIPE_SECRET_KEY },
   *     }],
   *   },
   */
  modules: [
    {
      resolve: '@medusajs/medusa/file',
      options: {
        providers: [
          {
            resolve: '@medusajs/medusa/file-s3',
            id: 's3',
            options: {
              file_url: process.env.S3_FILE_URL,
              access_key_id: process.env.S3_ACCESS_KEY_ID,
              secret_access_key: process.env.S3_SECRET_ACCESS_KEY,
              region: process.env.S3_REGION,
              bucket: process.env.S3_BUCKET,
              endpoint: process.env.S3_ENDPOINT,
            },
          },
        ],
      },
    },
  ],
});
