"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = infrastructureLoader;
const bullmq_1 = require("bullmq");
const ioredis_1 = __importDefault(require("ioredis"));
const odoo_client_js_1 = require("../client/odoo-client.js");
const product_worker_js_1 = require("../workers/product.worker.js");
const inventory_worker_js_1 = require("../workers/inventory.worker.js");
const order_worker_js_1 = require("../workers/order.worker.js");
const customer_worker_js_1 = require("../workers/customer.worker.js");
const offline_pos_worker_js_1 = require("../workers/offline-pos.worker.js");
const barcode_cache_worker_js_1 = require("../workers/barcode-cache.worker.js");
const index_js_1 = require("../types/index.js");
const ALL_QUEUES = [
    ...Object.values(index_js_1.QUEUE),
    'pos-offline-replay',
    'pos-session-close',
    'barcode-cache',
    'barcode-scan-log',
];
async function infrastructureLoader({ container, options: rawOptions, }) {
    const options = rawOptions;
    // ── Odoo Client ─────────────────────────────────────────────────────────────
    const odooClient = new odoo_client_js_1.OdooClient({
        url: options.odoo_url,
        db: options.odoo_db,
        username: options.odoo_username,
        password: options.odoo_password,
        timeout: options.odoo_timeout,
        rateLimit: options.odoo_rate_limit,
    });
    container.register('odooClient', { resolve: () => odooClient });
    // ── Redis (shared ioredis instance) ─────────────────────────────────────────
    const redisUrl = options.redis_url || process.env.REDIS_URL || 'redis://localhost:6379';
    const redisConn = new ioredis_1.default(redisUrl, { maxRetriesPerRequest: null, lazyConnect: true });
    await redisConn.connect().catch((err) => {
        console.warn('[medusa-odoo] Redis connect failed on boot:', err.message);
    });
    container.register('redis', { resolve: () => redisConn });
    // Silence BullMQ's per-queue eviction-policy warning (uses console.warn internally).
    // Filtered when Redis doesn't support CONFIG SET (Redis Enterprise, managed Redis).
    const origConsoleWarn = console.warn.bind(console);
    console.warn = (...args) => {
        if (typeof args[0] === 'string' && args[0].startsWith('IMPORTANT! Eviction policy'))
            return;
        origConsoleWarn(...args);
    };
    // Build ioredis-compatible connection config for BullMQ
    const url = new URL(redisUrl);
    const connection = {
        host: url.hostname,
        port: Number(url.port) || 6379,
        password: url.password || undefined,
        tls: url.protocol === 'rediss:' ? {} : undefined,
    };
    // ── BullMQ Queues ───────────────────────────────────────────────────────────
    const queues = {};
    for (const name of ALL_QUEUES) {
        queues[name] = new bullmq_1.Queue(name, { connection });
    }
    container.register('erpProductQueue', { resolve: () => queues[index_js_1.QUEUE.PRODUCT] });
    container.register('erpInventoryQueue', { resolve: () => queues[index_js_1.QUEUE.INVENTORY] });
    container.register('erpOrderQueue', { resolve: () => queues[index_js_1.QUEUE.ORDER] });
    container.register('erpCustomerQueue', { resolve: () => queues[index_js_1.QUEUE.CUSTOMER] });
    container.register('erpInvoiceQueue', { resolve: () => queues[index_js_1.QUEUE.INVOICE] });
    container.register('erpDlqQueue', { resolve: () => queues[index_js_1.QUEUE.DLQ] });
    container.register('posOfflineQueue', { resolve: () => queues['pos-offline-replay'] });
    container.register('barcodeCacheQueue', { resolve: () => queues['barcode-cache'] });
    container.register('erpQueues', { resolve: () => queues });
    // ── Workers ─────────────────────────────────────────────────────────────────
    // DISABLE_ERP_WORKERS=true → skip (used in Docker web container)
    // WORKER_MODE=erp|pos|barcode → start only that subset
    const disableWorkers = process.env.DISABLE_ERP_WORKERS === 'true' || process.env.NODE_ENV === 'test';
    const workerMode = process.env.WORKER_MODE;
    if (!disableWorkers) {
        if (!workerMode || workerMode === 'erp') {
            (0, product_worker_js_1.createProductWorker)(connection, container);
            (0, inventory_worker_js_1.createInventoryWorker)(connection, container);
            (0, order_worker_js_1.createOrderWorker)(connection, container);
            (0, customer_worker_js_1.createCustomerWorker)(connection, container);
        }
        if (!workerMode || workerMode === 'pos') {
            (0, offline_pos_worker_js_1.createOfflinePosWorker)(connection, container);
        }
        if (!workerMode || workerMode === 'barcode') {
            (0, barcode_cache_worker_js_1.createBarcodeCacheWorker)(connection, container);
        }
        console.log(`[medusa-odoo] Workers started (mode: ${workerMode || 'all'})`);
    }
    console.log('[medusa-odoo] Infrastructure loaded');
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5mcmFzdHJ1Y3R1cmUuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi9zcmMvbW9kdWxlcy9vZG9vLXN5bmMvbG9hZGVycy9pbmZyYXN0cnVjdHVyZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7OztBQW9CQSx1Q0FrRkM7QUFyR0QsbUNBQXlDO0FBQ3pDLHNEQUEwQztBQUMxQyw2REFBMkQ7QUFDM0Qsb0VBQXVFO0FBQ3ZFLHdFQUF5RTtBQUN6RSxnRUFBcUU7QUFDckUsc0VBQXdFO0FBQ3hFLDRFQUEyRTtBQUMzRSxnRkFBNkU7QUFDN0UsZ0RBQTREO0FBRTVELE1BQU0sVUFBVSxHQUFHO0lBQ2pCLEdBQUcsTUFBTSxDQUFDLE1BQU0sQ0FBQyxnQkFBSyxDQUFDO0lBQ3ZCLG9CQUFvQjtJQUNwQixtQkFBbUI7SUFDbkIsZUFBZTtJQUNmLGtCQUFrQjtDQUNWLENBQUE7QUFFSyxLQUFLLFVBQVUsb0JBQW9CLENBQ2hELEVBQ0UsU0FBUyxFQUNULE9BQU8sRUFBRSxVQUFVLEdBQytDO0lBRXBFLE1BQU0sT0FBTyxHQUFHLFVBQTBDLENBQUE7SUFDMUQsK0VBQStFO0lBQy9FLE1BQU0sVUFBVSxHQUFHLElBQUksMkJBQVUsQ0FBQztRQUNoQyxHQUFHLEVBQVMsT0FBTyxDQUFDLFFBQVE7UUFDNUIsRUFBRSxFQUFVLE9BQU8sQ0FBQyxPQUFPO1FBQzNCLFFBQVEsRUFBSSxPQUFPLENBQUMsYUFBYTtRQUNqQyxRQUFRLEVBQUksT0FBTyxDQUFDLGFBQWE7UUFDakMsT0FBTyxFQUFLLE9BQU8sQ0FBQyxZQUFZO1FBQ2hDLFNBQVMsRUFBRyxPQUFPLENBQUMsZUFBZTtLQUNwQyxDQUFDLENBQUE7SUFDRixTQUFTLENBQUMsUUFBUSxDQUFDLFlBQVksRUFBRSxFQUFFLE9BQU8sRUFBRSxHQUFHLEVBQUUsQ0FBQyxVQUFVLEVBQUUsQ0FBQyxDQUFBO0lBRS9ELCtFQUErRTtJQUMvRSxNQUFNLFFBQVEsR0FBSSxPQUFP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