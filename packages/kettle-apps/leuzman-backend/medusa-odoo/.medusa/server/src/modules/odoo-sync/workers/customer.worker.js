"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createCustomerWorker = createCustomerWorker;
const bullmq_1 = require("bullmq");
const index_js_1 = require("../types/index.js");
const index_js_2 = require("../index.js");
function createCustomerWorker(connection, container) {
    const worker = new bullmq_1.Worker(index_js_1.QUEUE.CUSTOMER, async (job) => {
        const { medusa_id, operation, triggered_by, idempotency_key, data } = job.data;
        const syncService = container.resolve(index_js_2.ODOO_SYNC_MODULE);
        const odooClient = container.resolve('odooClient');
        const startedAt = Date.now();
        const customer = data;
        try {
            let odooId = null;
            if (operation !== 'delete') {
                const vals = {
                    name: `${customer.first_name || ''} ${customer.last_name || ''}`.trim() || customer.email,
                    email: customer.email || '',
                    phone: customer.phone || false,
                    customer_rank: 1,
                    medusa_customer_id: medusa_id,
                };
                odooId = await odooClient.upsertCustomer(medusa_id, vals);
            }
            if (odooId)
                await syncService.upsertMapping('customer', medusa_id, odooId, 'medusa_to_odoo');
            await syncService.logSync({
                entity_type: 'customer', entity_id: medusa_id, operation,
                direction: 'medusa_to_odoo', status: 'success', trigger: triggered_by,
                idempotency_key, duration_ms: Date.now() - startedAt, odoo_id: odooId ?? undefined,
                attempt: job.attemptsMade + 1,
            });
        }
        catch (err) {
            await syncService.logSync({
                entity_type: 'customer', entity_id: medusa_id, operation,
                direction: 'medusa_to_odoo', status: 'failed', trigger: triggered_by,
                idempotency_key, duration_ms: Date.now() - startedAt, error_message: err.message,
                attempt: job.attemptsMade + 1,
            });
            throw err;
        }
    }, { connection, concurrency: 5 });
    worker.on('failed', async (job, err) => {
        if (job && job.attemptsMade >= 3) {
            const syncService = container.resolve(index_js_2.ODOO_SYNC_MODULE);
            await syncService.recordFailure({
                queue: index_js_1.QUEUE.CUSTOMER, job_id: job.id,
                entity_type: 'customer', entity_id: job.data.medusa_id,
                operation: job.data.operation, payload: job.data,
                error_message: err.message, error_stack: err.stack,
                attempt_count: job.attemptsMade,
            });
        }
    });
    worker.on('error', (err) => {
        console.error('[erp-worker:customer] Worker error:', err.message);
    });
    return worker;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY3VzdG9tZXIud29ya2VyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vc3JjL21vZHVsZXMvb2Rvby1zeW5jL3dvcmtlcnMvY3VzdG9tZXIud29ya2VyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7O0FBS0Esb0RBOERDO0FBbkVELG1DQUFvQztBQUNwQyxnREFBNkQ7QUFFN0QsMENBQStEO0FBRS9ELFNBQWdCLG9CQUFvQixDQUFDLFVBQWUsRUFBRSxTQUFjO0lBQ2xFLE1BQU0sTUFBTSxHQUFHLElBQUksZUFBTSxDQUN2QixnQkFBSyxDQUFDLFFBQVEsRUFDZCxLQUFLLEVBQUUsR0FBNEIsRUFBRSxFQUFFO1FBQ3JDLE1BQU0sRUFBRSxTQUFTLEVBQUUsU0FBUyxFQUFFLFlBQVksRUFBRSxlQUFlLEVBQUUsSUFBSSxFQUFFLEdBQUcsR0FBRyxDQUFDLElBQUksQ0FBQTtRQUM5RSxNQUFNLFdBQVcsR0FBb0IsU0FBUyxDQUFDLE9BQU8sQ0FBQywyQkFBZ0IsQ0FBQyxDQUFBO1FBQ3hFLE1BQU0sVUFBVSxHQUFlLFNBQVMsQ0FBQyxPQUFPLENBQUMsWUFBWSxDQUFDLENBQUE7UUFDOUQsTUFBTSxTQUFTLEdBQUcsSUFBSSxDQUFDLEdBQUcsRUFBRSxDQUFBO1FBQzVCLE1BQU0sUUFBUSxHQUFHLElBQVcsQ0FBQTtRQUU1QixJQUFJLENBQUM7WUFDSCxJQUFJLE1BQU0sR0FBa0IsSUFBSSxDQUFBO1lBRWhDLElBQUksU0FBUyxLQUFLLFFBQVEsRUFBRSxDQUFDO2dCQUMzQixNQUFNLElBQUksR0FBRztvQkFDWCxJQUFJLEVBQVcsR0FBRyxRQUFRLENBQUMsVUFBVSxJQUFJLEVBQUUsSUFBSSxRQUFRLENBQUMsU0FBUyxJQUFJLEVBQUUsRUFBRSxDQUFDLElBQUksRUFBRSxJQUFJLFFBQVEsQ0FBQyxLQUFLO29CQUNsRyxLQUFLLEVBQVUsUUFBUSxDQUFDLEtBQUssSUFBSSxFQUFFO29CQUNuQyxLQUFLLEVBQVUs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