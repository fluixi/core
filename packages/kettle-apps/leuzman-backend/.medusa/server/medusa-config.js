"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const utils_1 = require("@medusajs/framework/utils");
const env = process.env.NODE_ENV || 'development';
(0, utils_1.loadEnv)(env, process.cwd());
module.exports = (0, utils_1.defineConfig)({
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
            storeCors: process.env.STORE_CORS,
            adminCors: process.env.ADMIN_CORS,
            authCors: process.env.AUTH_CORS,
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
            resolve: `medusa-social-commerce`,
            options: {
                tiktok_client_key: process.env.TIKTOK_CLIENT_KEY,
                tiktok_client_secret: process.env.TIKTOK_CLIENT_SECRET,
                tiktok_redirect_uri: process.env.TIKTOK_REDIRECT_URI,
                tiktok_state_secret: process.env.TIKTOK_STATE_SECRET,
                tiktok_scopes: process.env.TIKTOK_SCOPES ?? 'user.info.basic,video.list,live.room.status.query',
                encryption_key: process.env.SC_ENCRYPTION_KEY,
                redis_url: process.env.REDIS_URL,
                reservation_ttl_seconds: 300,
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWVkdXNhLWNvbmZpZy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uL21lZHVzYS1jb25maWcudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7QUFBQSxxREFBMkU7QUFFM0UsTUFBTSxHQUFHLEdBQUcsT0FBTyxDQUFDLEdBQUcsQ0FBQyxRQUFRLElBQUksYUFBYSxDQUFBO0FBQ2pELElBQUEsZUFBTyxFQUFDLEdBQUcsRUFBRSxPQUFPLENBQUMsR0FBRyxFQUFFLENBQUMsQ0FBQztBQUc1QixNQUFNLENBQUMsT0FBTyxHQUFHLElBQUEsb0JBQVksRUFBQztJQUM1QixhQUFhLEVBQUU7UUFDYixXQUFXLEVBQUUsT0FBTyxDQUFDLEdBQUcsQ0FBQyxZQUFZO1FBQ3JDLFFBQVEsRUFBRSxPQUFPLENBQUMsR0FBRyxDQUFDLFNBQVM7UUFDL0IsSUFBSSxFQUFFO1lBQ0o7Ozs7O2VBS0c7WUFDSCxTQUFTLEVBQUUsT0FBTyxDQUFDLEdBQUcsQ0FBQyxVQUFXO1lBQ2xDLFNBQVMsRUFBRSxPQUFPLENBQUMsR0FBRyxDQUFDLFVBQVc7WUFDbEMsUUFBUSxFQUFFLE9BQU8sQ0FBQyxHQUFHLENBQUMsU0FBVTtZQUNoQyxTQUFTLEVBQUUsT0FBTyxDQUFDLEdBQUcsQ0FBQyxVQUFVLElBQUksYUFBYTtZQUNsRCxZQUFZLEVBQUUsT0FBTyxDQUFDLEdBQUcsQ0FBQyxhQUFhLElBQUksYUFBYTtTQUN6RDtRQUNELHFCQUFxQixFQUFFO1lBQ3JCLEdBQUcsRUFBRSxLQUFLO1lBQ1YsT0FBTyxFQUFFLFNBQVM7WUFDbEIsVUFBVSxFQUFFO2dCQUNWLEdBQUcsRUFBRSxLQUFLO2FBQ1g7U0FDRjtLQUNGO0lBRUQsT0FBTyxFQUFFO1FBQ1A7WUFDRSxPQUFPLEVBQUUsV0FBVztZQUNwQixPQUFPLEVBQUU7Z0JBQ1AsSUFBSSxFQUFFLGVBQWU7YUFDdEI7U0FDRjtRQUNEO1lBQ0UsT0FBTyxFQUFFLGdCQUFnQjtZQUN6QixPQUFPLEVBQUU7Z0JBQ1AsSUFBSSxFQUFFLGdCQUFnQjthQUN2QjtTQUNGO1FBQ0Q7WUFDRSxPQUFPLEVBQUUsb0JBQW9CO1lBQzdCLE9BQU8sRUFBRTtnQkFDUCxJQUFJLEVBQUUsb0JBQW9CO2FBQzNCO1NBQ0Y7UUFDRDtZQUNFLE9BQU8sRUFBRSx3QkFBd0I7WUFDakMsT0FBTyxFQUFFO2dCQUNQLGlCQUFpQixFQUFTLE9BQU8sQ0FBQyxHQUFHLENBQUMsaUJBQWlCO2dCQUN2RCxvQkFBb0IsRUFBTSxPQUFPLENBQUMsR0FBRyxDQUFDLG9CQUFvQjtnQkFDMUQsbUJBQW1CLEVBQU8sT0FBTyxDQUFDLEdBQUcsQ0FBQyxtQkFBbUI7Z0JBQ3pELG1CQUFtQixFQUFPLE9BQU8sQ0FBQyxHQUFHLENBQUMsbUJBQW1CO2dCQUN6RCxhQUFhLEVBQWEsT0FBTyxDQUFDLEdBQUcsQ0FBQyxhQUFhLElBQUksbURBQW1EO2dCQUMxRyxjQUFjLEVBQVksT0FBTyxDQUFDLEdBQUcsQ0FBQyxpQkFBaUI7Z0JBQ3ZELFNBQVMsRUFBaUIsT0FBTyxDQUFDLEdBQUcsQ0FBQyxTQUFTO2dCQUMvQyx1QkFBdUIsRUFBRyxHQUFHO2FBQzlCO1NBQ0Y7S0FDRjtJQUNELEtBQUssRUFBRTtRQUNMLE9BQU8sRUFBRSxJQUFJO1FBQ2IsSUFBSSxFQUFFLEdBQUcsRUFBRSxDQUFDLENBQUM7WUFDWCxNQUFNLEVBQUU7Z0JBQ04sSUFBSSxFQUFFLFNBQVM7Z0JBQ2YsWUFBWSxFQUFFLENBQUMsV0FBVyxFQUFFLFlBQVksRUFBRSxXQUFXLEVBQUUsR0FBRyxDQUFDO2dCQUMzRCxFQUFFLEVBQUU7b0JBQ0YsTUFBTSxFQUFFLEtBQUs7b0JBQ2IsS0FBSyxFQUFFO3dCQUNMLE9BQU8sQ0FBQyxHQUFHLEVBQUUsRUFBRSxZQUFZO3dCQUMzQixTQUFTLEVBQUUsU0FBUztxQkFDckI7aUJBQ0Y7Z0JBQ0QsR0FBRyxFQUFFLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSxVQUFVLEVBQUUsSUFBSSxFQUFFO2FBQ3RDO1lBQ0QsWUFBWSxFQUFFO2dCQUNaLEtBQUssRUFBRSxJQUFJO2FBQ1o7WUFDRCxRQUFRLEVBQUUsR0FBRyxPQUFPLENBQUMsR0FBRyxFQUFFLHFCQUFxQjtTQUNoRCxDQUFDO0tBQ0g7SUFFRDs7Ozs7Ozs7Ozs7T0FXRztJQUNILE9BQU8sRUFBRTtRQUNQO1lBQ0UsT0FBTyxFQUFFLHVCQUF1QjtZQUNoQyxPQUFPLEVBQUU7Z0JBQ1AsU0FBUyxFQUFFO29CQUNUO3dCQUNFLE9BQU8sRUFBRSwwQkFBMEI7d0JBQ25DLEVBQUUsRUFBRSxJQUFJO3dCQUNSLE9BQU8sRUFBRTs0QkFDUCxRQUFRLEVBQUUsT0FBTyxDQUFDLEdBQUcsQ0FBQyxXQUFXOzRCQUNqQyxhQUFhLEVBQUUsT0FBTyxDQUFDLEdBQUcsQ0FBQyxnQkFBZ0I7NEJBQzNDLGlCQUFpQixFQUFFLE9BQU8sQ0FBQyxHQUFHLENBQUMsb0JBQW9COzRCQUNuRCxNQUFNLEVBQUUsT0FBTyxDQUFDLEdBQUcsQ0FBQyxTQUFTOzRCQUM3QixNQUFNLEVBQUUsT0FBTyxDQUFDLEdBQUcsQ0FBQyxTQUFTOzRCQUM3QixRQUFRLEVBQUUsT0FBTyxDQUFDLEdBQUcsQ0FBQyxXQUFXO3lCQUNsQztxQkFDRjtpQkFDRjthQUNGO1NBQ0Y7S0FDRjtDQUNGLENBQUMsQ0FBQyJ9