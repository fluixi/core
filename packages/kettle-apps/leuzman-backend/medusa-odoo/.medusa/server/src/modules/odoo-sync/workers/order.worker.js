"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createOrderWorker = createOrderWorker;
const bullmq_1 = require("bullmq");
const index_js_1 = require("../types/index.js");
const index_js_2 = require("../index.js");
function createOrderWorker(connection, container) {
    const worker = new bullmq_1.Worker(index_js_1.QUEUE.ORDER, async (job) => {
        const { medusa_id, operation, triggered_by, idempotency_key, data } = job.data;
        const syncService = container.resolve(index_js_2.ODOO_SYNC_MODULE);
        const odooClient = container.resolve('odooClient');
        const startedAt = Date.now();
        try {
            let odooId = null;
            const order = data;
            if (operation === 'delete') {
                const existing = await odooClient.getOrderByMedusaId(medusa_id);
                if (existing) {
                    await odooClient.write('sale.order', [existing.id], { state: 'cancel' });
                    odooId = existing.id;
                }
            }
            else {
                const existingOrder = await odooClient.getOrderByMedusaId(medusa_id);
                if (existingOrder && operation === 'create') {
                    odooId = existingOrder.id;
                }
                else {
                    // find or create partner
                    const email = order.email || '';
                    let partners = await odooClient.search('res.partner', [['email', '=', email]], ['id'], 1);
                    let partnerId = partners[0]?.id;
                    if (!partnerId) {
                        const addr = order.shipping_address || order.billing_address || {};
                        partnerId = await odooClient.create('res.partner', {
                            name: `${addr.first_name || ''} ${addr.last_name || ''}`.trim() || email,
                            email,
                            customer_rank: 1,
                            medusa_customer_id: order.customer_id,
                        });
                    }
                    const lines = [];
                    for (const item of (order.items || [])) {
                        const sku = item.variant?.sku;
                        const variantMedusaId = item.variant_id;
                        const products = await odooClient.search('product.product', ['|', ['default_code', '=', sku], ['medusa_variant_id', '=', variantMedusaId]], ['id'], 1);
                        if (products[0]) {
                            lines.push({
                                product_id: products[0].id,
                                product_uom_qty: item.quantity || 1,
                                price_unit: (item.unit_price || 0) / 100,
                                name: item.title || '',
                            });
                        }
                    }
                    odooId = await odooClient.createSaleOrder({
                        partner_id: partnerId,
                        medusa_order_id: medusa_id,
                        client_order_ref: order.display_id || medusa_id,
                        note: `MedusaJS order. ID: ${medusa_id}`,
                    }, lines);
                }
            }
            if (odooId)
                await syncService.upsertMapping('order', medusa_id, odooId, 'medusa_to_odoo');
            await syncService.logSync({
                entity_type: 'order', entity_id: medusa_id, operation,
                direction: 'medusa_to_odoo', status: 'success', trigger: triggered_by,
                idempotency_key, duration_ms: Date.now() - startedAt, odoo_id: odooId ?? undefined,
                attempt: job.attemptsMade + 1,
            });
        }
        catch (err) {
            await syncService.logSync({
                entity_type: 'order', entity_id: medusa_id, operation,
                direction: 'medusa_to_odoo', status: 'failed', trigger: triggered_by,
                idempotency_key, duration_ms: Date.now() - startedAt, error_message: err.message,
                attempt: job.attemptsMade + 1,
            });
            throw err;
        }
    }, { connection, concurrency: 3 });
    worker.on('failed', async (job, err) => {
        if (job && job.attemptsMade >= 3) {
            const syncService = container.resolve(index_js_2.ODOO_SYNC_MODULE);
            await syncService.recordFailure({
                queue: index_js_1.QUEUE.ORDER, job_id: job.id,
                entity_type: 'order', entity_id: job.data.medusa_id,
                operation: job.data.operation, payload: job.data,
                error_message: err.message, error_stack: err.stack,
                attempt_count: job.attemptsMade,
            });
        }
    });
    worker.on('error', (err) => {
        console.error('[erp-worker:order] Worker error:', err.message);
    });
    return worker;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoib3JkZXIud29ya2VyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vc3JjL21vZHVsZXMvb2Rvby1zeW5jL3dvcmtlcnMvb3JkZXIud29ya2VyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7O0FBS0EsOENBaUhDO0FBdEhELG1DQUFvQztBQUNwQyxnREFBMEQ7QUFFMUQsMENBQStEO0FBRS9ELFNBQWdCLGlCQUFpQixDQUFDLFVBQWUsRUFBRSxTQUFjO0lBQy9ELE1BQU0sTUFBTSxHQUFHLElBQUksZUFBTSxDQUN2QixnQkFBSyxDQUFDLEtBQUssRUFDWCxLQUFLLEVBQUUsR0FBeUIsRUFBRSxFQUFFO1FBQ2xDLE1BQU0sRUFBRSxTQUFTLEVBQUUsU0FBUyxFQUFFLFlBQVksRUFBRSxlQUFlLEVBQUUsSUFBSSxFQUFFLEdBQUcsR0FBRyxDQUFDLElBQUksQ0FBQTtRQUM5RSxNQUFNLFdBQVcsR0FBb0IsU0FBUyxDQUFDLE9BQU8sQ0FBQywyQkFBZ0IsQ0FBQyxDQUFBO1FBQ3hFLE1BQU0sVUFBVSxHQUFlLFNBQVMsQ0FBQyxPQUFPLENBQUMsWUFBWSxDQUFDLENBQUE7UUFDOUQsTUFBTSxTQUFTLEdBQUcsSUFBSSxDQUFDLEdBQUcsRUFBRSxDQUFBO1FBRTVCLElBQUksQ0FBQztZQUNILElBQUksTUFBTSxHQUFrQixJQUFJLENBQUE7WUFDaEMsTUFBTSxLQUFLLEdBQUcsSUFBVyxDQUFBO1lBRXpCLElBQUksU0FBUyxLQUFLLFFBQVEsRUFBRSxDQUFDO2dCQUMzQixNQUFNLFFBQVEsR0FBRyxNQUFNLFVBQVUsQ0FBQyxrQkFBa0IsQ0FBQyxTQUFTLENBQUMsQ0FBQTtnQkFDL0QsSUFBSSxRQUFRLEVBQUUsQ0FBQztvQkFDYixNQUFNLFVBQVUsQ0FBQyxLQUFLLENBQUMsWUFBWSxFQUFFLENBQUMsUUFBUSxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUUsS0FBSyxFQUFFLFFBQVEsRUFBRSxDQUFDLENBQUE7b0JBQ3hF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