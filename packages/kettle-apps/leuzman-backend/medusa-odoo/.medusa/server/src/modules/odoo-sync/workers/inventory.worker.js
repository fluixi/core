"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createInventoryWorker = createInventoryWorker;
const bullmq_1 = require("bullmq");
const index_js_1 = require("../types/index.js");
const index_js_2 = require("../index.js");
function createInventoryWorker(connection, container) {
    const worker = new bullmq_1.Worker(index_js_1.QUEUE.INVENTORY, async (job) => {
        const { variant_id, location_id, quantity, medusa_id, operation, triggered_by, idempotency_key } = job.data;
        const syncService = container.resolve(index_js_2.ODOO_SYNC_MODULE);
        const odooClient = container.resolve('odooClient');
        const startedAt = Date.now();
        try {
            // get odoo product id from variant mapping
            const odooProductId = await syncService.getOdooId('variant', variant_id);
            if (!odooProductId)
                throw new Error(`No Odoo mapping found for variant ${variant_id}`);
            // find odoo location
            let odooLocationId = null;
            if (location_id) {
                const locs = await odooClient.search('stock.location', [['medusa_location_id', '=', location_id]], ['id'], 1);
                odooLocationId = locs[0]?.id ?? null;
            }
            if (!odooLocationId) {
                // fallback: use default internal location
                const locs = await odooClient.search('stock.location', [['usage', '=', 'internal'], ['active', '=', true]], ['id'], 1);
                odooLocationId = locs[0]?.id ?? null;
            }
            if (!odooLocationId)
                throw new Error('No suitable Odoo stock location found');
            await odooClient.updateStockQuantity(odooProductId, odooLocationId, quantity ?? 0);
            await syncService.logSync({
                entity_type: 'inventory',
                entity_id: medusa_id,
                operation,
                direction: 'medusa_to_odoo',
                status: 'success',
                trigger: triggered_by,
                idempotency_key,
                duration_ms: Date.now() - startedAt,
                attempt: job.attemptsMade + 1,
            });
        }
        catch (err) {
            await syncService.logSync({
                entity_type: 'inventory',
                entity_id: medusa_id,
                operation,
                direction: 'medusa_to_odoo',
                status: 'failed',
                trigger: triggered_by,
                idempotency_key,
                duration_ms: Date.now() - startedAt,
                error_message: err.message,
                attempt: job.attemptsMade + 1,
            });
            throw err;
        }
    }, { connection, concurrency: 10 });
    worker.on('failed', async (job, err) => {
        if (job && job.attemptsMade >= 5) {
            const syncService = container.resolve(index_js_2.ODOO_SYNC_MODULE);
            await syncService.recordFailure({
                queue: index_js_1.QUEUE.INVENTORY, job_id: job.id,
                entity_type: 'inventory', entity_id: job.data.medusa_id,
                operation: job.data.operation, payload: job.data,
                error_message: err.message, error_stack: err.stack,
                attempt_count: job.attemptsMade,
            });
        }
    });
    worker.on('error', (err) => {
        console.error('[erp-worker:inventory] Worker error:', err.message);
    });
    return worker;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW52ZW50b3J5Lndvcmtlci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uL3NyYy9tb2R1bGVzL29kb28tc3luYy93b3JrZXJzL2ludmVudG9yeS53b3JrZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7QUFLQSxzREEwRkM7QUEvRkQsbUNBQW9DO0FBQ3BDLGdEQUE4RDtBQUU5RCwwQ0FBK0Q7QUFFL0QsU0FBZ0IscUJBQXFCLENBQ25DLFVBQWUsRUFDZixTQUFjO0lBRWQsTUFBTSxNQUFNLEdBQUcsSUFBSSxlQUFNLENBQ3ZCLGdCQUFLLENBQUMsU0FBUyxFQUNmLEtBQUssRUFBRSxHQUE2QixFQUFFLEVBQUU7UUFDdEMsTUFBTSxFQUFFLFVBQVUsRUFBRSxXQUFXLEVBQUUsUUFBUSxFQUFFLFNBQVMsRUFBRSxTQUFTLEVBQUUsWUFBWSxFQUFFLGVBQWUsRUFBRSxHQUFHLEdBQUcsQ0FBQyxJQUFJLENBQUE7UUFDM0csTUFBTSxXQUFXLEdBQW9CLFNBQVMsQ0FBQyxPQUFPLENBQUMsMkJBQWdCLENBQUMsQ0FBQTtRQUN4RSxNQUFNLFVBQVUsR0FBZSxTQUFTLENBQUMsT0FBTyxDQUFDLFlBQVksQ0FBQyxDQUFBO1FBQzlELE1BQU0sU0FBUyxHQUFHLElBQUksQ0FBQyxHQUFHLEVBQUUsQ0FBQTtRQUU1QixJQUFJLENBQUM7WUFDSCwyQ0FBMkM7WUFDM0MsTUFBTSxhQUFhLEdBQUcsTUFBTSxXQUFXLENBQUMsU0FBUyxDQUFDLFNBQVMsRUFBRSxVQUFVLENBQUMsQ0FBQTtZQUN4RSxJQUFJLENBQUMsYUFBYTtnQkFBRSxNQUFNLElBQUksS0FBSyxDQUFDLHFDQUFxQyxVQUFVLEVBQUUsQ0FBQyxDQUFBO1lBRXRGLHFCQUFxQjtZQUNyQixJQUFJLGNBQWMsR0FBa0IsSUFBSSxDQUFBO1lBQ3hDLElBQUksV0FBVyxFQUFFLENBQUM7Z0JBQ2hCLE1BQU0sSUFBSSxHQUFHLE1BQU0sVUFBVSxDQUFDLE1BQU0sQ0FD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