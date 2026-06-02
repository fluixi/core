"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createBarcodeCacheWorker = createBarcodeCacheWorker;
/**
 * barcode-cache worker — keeps the Redis barcode cache warm.
 *
 * Jobs arrive on queue 'barcode:cache' with payload:
 *   { type: 'warmAll' }         — rebuild entire cache (scheduled nightly)
 *   { type: 'invalidate', barcode, context? } — bust specific entry on product update
 *   { type: 'warmSingle', barcode } — resolve and cache a single barcode
 */
const bullmq_1 = require("bullmq");
const barcode_resolver_js_1 = require("../barcode/barcode-resolver.js");
function createBarcodeCacheWorker(connection, container) {
    const worker = new bullmq_1.Worker('barcode-cache', async (job) => {
        const odooClient = container.resolve('odooClient');
        const redis = container.resolve('redis');
        const resolver = new barcode_resolver_js_1.BarcodeResolver(container, odooClient, redis);
        switch (job.data.type) {
            case 'warmAll': {
                // Fetch all active variant SKUs from Medusa and warm their cache
                const productModule = container.resolve('productModuleService');
                const variants = await productModule.listProductVariants({}, { select: ['sku', 'id'], take: 2000 });
                const barcodes = variants.map((v) => v.sku).filter(Boolean);
                const result = await resolver.warmCache(barcodes);
                console.log(`[barcode-cache] Warm all: ${result.warmed} warmed, ${result.failed} failed`);
                return result;
            }
            case 'invalidate': {
                if (!job.data.barcode)
                    throw new Error('barcode required for invalidate');
                await resolver.invalidate(job.data.barcode, job.data.context);
                console.log(`[barcode-cache] Invalidated ${job.data.barcode}`);
                return { invalidated: job.data.barcode };
            }
            case 'warmSingle': {
                if (!job.data.barcode)
                    throw new Error('barcode required for warmSingle');
                const result = await resolver.resolve(job.data.barcode, 'pos');
                return { found: !!result, barcode: job.data.barcode };
            }
            default:
                throw new Error(`Unknown barcode cache job type: ${job.data.type}`);
        }
    }, { connection, concurrency: 2 });
    worker.on('failed', (job, err) => {
        console.error(`[barcode-cache] Job ${job?.id} failed:`, err.message);
    });
    worker.on('error', (err) => {
        console.error('[erp-worker:barcode-cache] Worker error:', err.message);
    });
    return worker;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYmFyY29kZS1jYWNoZS53b3JrZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi9zcmMvbW9kdWxlcy9vZG9vLXN5bmMvd29ya2Vycy9iYXJjb2RlLWNhY2hlLndvcmtlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOztBQWtCQSw0REFnREM7QUFsRUQ7Ozs7Ozs7R0FPRztBQUNILG1DQUFvQztBQUNwQyx3RUFBcUY7QUFTckYsU0FBZ0Isd0JBQXdCLENBQUMsVUFBZSxFQUFFLFNBQWM7SUFDdEUsTUFBTSxNQUFNLEdBQUcsSUFBSSxlQUFNLENBQ3ZCLGVBQWUsRUFDZixLQUFLLEVBQUUsR0FBNkIsRUFBRSxFQUFFO1FBQ3RDLE1BQU0sVUFBVSxHQUFlLFNBQVMsQ0FBQyxPQUFPLENBQUMsWUFBWSxDQUFDLENBQUE7UUFDOUQsTUFBTSxLQUFLLEdBQW9CLFNBQVMsQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLENBQUE7UUFDekQsTUFBTSxRQUFRLEdBQWlCLElBQUkscUNBQWUsQ0FBQyxTQUFTLEVBQUUsVUFBVSxFQUFFLEtBQUssQ0FBQyxDQUFBO1FBRWhGLFFBQVEsR0FBRyxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUUsQ0FBQztZQUN0QixLQUFLLFNBQVMsQ0FBQyxDQUFDLENBQUM7Z0JBQ2YsaUVBQWlFO2dCQUNqRSxNQUFNLGFBQWEsR0FBRyxTQUFTLENBQUMsT0FBTyxDQUFDLHNCQUFzQixDQUFRLENBQUE7Z0JBQ3RFLE1BQU0sUUFBUSxHQUFHLE1BQU0sYUFBYSxDQUFDLG1CQUFtQixDQUFDLEVBQUUsRUFBRSxFQUFFLE1BQU0sRUFBRSxDQUFDLEtBQUssRUFBRSxJQUFJLENBQUMsRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQTtnQkFDbkcsTUFBTSxRQUFRLEdBQUksUUFBUSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQU0sRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsQ0FBQTtnQkFDakUsTUFBTSxNQUFNLEdBQU0sTUFBTSxRQUFRLENBQUMsU0FBUyxDQUFDLFFBQVEsQ0FBQyxDQUFBO2dCQUNwRCxPQUFPLENBQUMsR0FBRyxDQUFDLDZCQUE2QixNQUFNLENBQUMsTUFBTSxZQUFZLE1BQU0sQ0FBQyxNQUFNLFNBQVMsQ0FBQyxDQUFBO2dCQUN6RixPQUFPLE1BQU0sQ0FBQTtZQUNmLENBQUM7WUFFRCxLQUFLLFlBQVksQ0FBQyxDQUFDLENBQUM7Z0JBQ2xCLElBQUksQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLE9BQU87b0JBQUUsTUFBTSxJQUFJLEtBQUssQ0FBQyxpQ0FBaUMsQ0FBQyxDQUFBO2dCQUN6RSxNQUFNLFFBQVEsQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxPQUFPLEVBQUUsR0FBRyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQTtnQkFDN0QsT0FBTyxDQUFDLEdBQUcsQ0FBQywrQkFBK0IsR0FBRyxDQUFDLElBQUksQ0FBQyxPQUFPLEVBQUUsQ0FBQyxDQUFBO2dCQUM5RCxPQUFPLEVBQUUsV0FBVyxFQUFFLEdBQUcsQ0FBQyxJQUFJLENBQUMsT0FBTyxFQUFFLENBQUE7WUFDMUMsQ0FBQztZQUVELEtBQUssWUFBWSxDQUFDLENBQUMsQ0FBQztnQkFDbEIsSUFBSSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsT0FBTztvQkFBRSxNQUFNLElBQUksS0FBSyxDQUFDLGlDQUFpQyxDQUFDLENBQUE7Z0JBQ3pFLE1BQU0sTUFBTSxHQUFHLE1BQU0sUUFBUSxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLE9BQU8sRUFBRSxLQUFLLENBQUMsQ0FBQTtnQkFDOUQsT0FBTyxFQUFFLEtBQUssRUFBRSxDQUFDLENBQUMsTUFBTSxFQUFFLE9BQU8sRUFBRSxHQUFHLENBQUMsSUFBSSxDQUFDLE9BQU8sRUFBRSxDQUFBO1lBQ3ZELENBQUM7WUFFRDtnQkFDRSxNQUFNLElBQUksS0FBSyxDQUFDLG1DQUFvQyxHQUFHLENBQUMsSUFBWSxDQUFDLElBQUksRUFBRSxDQUFDLENBQUE7UUFDaEYsQ0FBQztJQUNILENBQUMsRUFDRCxFQUFFLFVBQVUsRUFBRSxXQUFXLEVBQUUsQ0FBQyxFQUFFLENBQy9CLENBQUE7SUFFRCxNQUFNLENBQUMsRUFBRSxDQUFDLFFBQVEsRUFBRSxDQUFDLEdBQUcsRUFBRSxHQUFHLEVBQUUsRUFBRTtRQUMvQixPQUFPLENBQUMsS0FBSyxDQUFDLHVCQUF1QixHQUFHLEVBQUUsRUFBRSxVQUFVLEVBQUUsR0FBRyxDQUFDLE9BQU8sQ0FBQyxDQUFBO0lBQ3RFLENBQUMsQ0FBQyxDQUFBO0lBRUYsTUFBTSxDQUFDLEVBQUUsQ0FBQyxPQUFPLEVBQUUsQ0FBQyxHQUFHLEVBQUUsRUFBRTtRQUN6QixPQUFPLENBQUMsS0FBSyxDQUFDLDBDQUEwQyxFQUFFLEdBQUcsQ0FBQyxPQUFPLENBQUMsQ0FBQTtJQUN4RSxDQUFDLENBQUMsQ0FBQTtJQUVGLE9BQU8sTUFBTSxDQUFBO0FBQ2YsQ0FBQyJ9