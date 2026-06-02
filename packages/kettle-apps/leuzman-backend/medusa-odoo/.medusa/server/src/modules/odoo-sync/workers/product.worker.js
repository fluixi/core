"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createProductWorker = createProductWorker;
const bullmq_1 = require("bullmq");
const index_js_1 = require("../types/index.js");
const index_js_2 = require("../index.js");
function createProductWorker(connection, container) {
    const worker = new bullmq_1.Worker(index_js_1.QUEUE.PRODUCT, async (job) => {
        const { entity_type, medusa_id, operation, idempotency_key, data } = job.data;
        const syncService = container.resolve(index_js_2.ODOO_SYNC_MODULE);
        const odooClient = container.resolve('odooClient');
        const startedAt = Date.now();
        try {
            let odooId = null;
            if (operation === 'delete') {
                odooId = await syncService.getOdooId('product', medusa_id);
                if (odooId) {
                    await odooClient.write('product.template', [odooId], { active: false });
                }
            }
            else {
                const productData = data;
                const vals = {
                    name: productData.title || 'Untitled',
                    description_sale: productData.description || '',
                    type: 'product',
                    medusa_product_id: medusa_id,
                    medusa_synced: true,
                    medusa_sync_date: new Date().toISOString(),
                };
                odooId = await odooClient.upsertProduct(medusa_id, vals);
                // sync variants
                if (productData.variants?.length) {
                    for (const variant of productData.variants) {
                        const variantVals = {
                            default_code: variant.sku || '',
                            barcode: variant.barcode || false,
                            list_price: (variant.prices?.[0]?.amount || 0) / 100,
                            medusa_variant_id: variant.id,
                            medusa_product_id: medusa_id,
                            medusa_synced: true,
                        };
                        await odooClient.upsertVariant(variant.id, variantVals);
                    }
                }
            }
            await syncService.upsertMapping('product', medusa_id, odooId ?? 0, 'medusa_to_odoo');
            await syncService.logSync({
                entity_type: 'product',
                entity_id: medusa_id,
                operation,
                direction: 'medusa_to_odoo',
                status: 'success',
                trigger: job.data.triggered_by,
                idempotency_key,
                duration_ms: Date.now() - startedAt,
                odoo_id: odooId ?? undefined,
                attempt: job.attemptsMade + 1,
            });
        }
        catch (err) {
            await syncService.logSync({
                entity_type: 'product',
                entity_id: medusa_id,
                operation,
                direction: 'medusa_to_odoo',
                status: 'failed',
                trigger: job.data.triggered_by,
                idempotency_key,
                duration_ms: Date.now() - startedAt,
                error_message: err.message,
                attempt: job.attemptsMade + 1,
            });
            throw err;
        }
    }, { connection, concurrency: 5 });
    worker.on('failed', async (job, err) => {
        if (job && job.attemptsMade >= 3) {
            const syncService = container.resolve(index_js_2.ODOO_SYNC_MODULE);
            await syncService.recordFailure({
                queue: index_js_1.QUEUE.PRODUCT,
                job_id: job.id,
                entity_type: 'product',
                entity_id: job.data.medusa_id,
                operation: job.data.operation,
                payload: job.data,
                error_message: err.message,
                error_stack: err.stack,
                attempt_count: job.attemptsMade,
            });
        }
    });
    worker.on('error', (err) => {
        console.error('[erp-worker:product] Worker error:', err.message);
    });
    return worker;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJvZHVjdC53b3JrZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi9zcmMvbW9kdWxlcy9vZG9vLXN5bmMvd29ya2Vycy9wcm9kdWN0Lndvcmtlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOztBQUtBLGtEQXNHQztBQTNHRCxtQ0FBb0M7QUFDcEMsZ0RBQTREO0FBRTVELDBDQUErRDtBQUUvRCxTQUFnQixtQkFBbUIsQ0FDakMsVUFBZ0QsRUFDaEQsU0FBYztJQUVkLE1BQU0sTUFBTSxHQUFHLElBQUksZUFBTSxDQUN2QixnQkFBSyxDQUFDLE9BQU8sRUFDYixLQUFLLEVBQUUsR0FBMkIsRUFBRSxFQUFFO1FBQ3BDLE1BQU0sRUFBRSxXQUFXLEVBQUUsU0FBUyxFQUFFLFNBQVMsRUFBRSxlQUFlLEVBQUUsSUFBSSxFQUFFLEdBQUcsR0FBRyxDQUFDLElBQUksQ0FBQTtRQUM3RSxNQUFNLFdBQVcsR0FBb0IsU0FBUyxDQUFDLE9BQU8sQ0FBQywyQkFBZ0IsQ0FBQyxDQUFBO1FBQ3hFLE1BQU0sVUFBVSxHQUFlLFNBQVMsQ0FBQyxPQUFPLENBQUMsWUFBWSxDQUFDLENBQUE7UUFDOUQsTUFBTSxTQUFTLEdBQUcsSUFBSSxDQUFDLEdBQUcsRUFBRSxDQUFBO1FBRTVCLElBQUksQ0FBQztZQUNILElBQUksTUFBTSxHQUFrQixJQUFJLENBQUE7WUFFaEMsSUFBSSxTQUFTLEtBQUssUUFBUSxFQUFFLENBQUM7Z0JBQzNCLE1BQU0sR0FBRyxNQUFNLFdBQVcsQ0FBQyxTQUFTLENBQUMsU0FBUyxFQUFFLFNBQVMsQ0FBQyxDQUFBO2dCQUMxRCxJQUFJLE1BQU0sRUFBRSxDQUFDO29CQUNYLE1BQU0sVUFBVSxDQUFDLEtBQUssQ0FBQyxrQkFBa0IsRUFBRSxDQUFDLE1BQU0sQ0FBQyxFQUFFLEVBQUUsTUFBTSxFQUFFLEtBQUssRUFBRSxDQUFDLENBQUE7Z0JBQ3pFLENBQUM7WUFDSCxDQUFDO2lCQUFNLENBQUM7Z0JB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