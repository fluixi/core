"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createOfflinePosWorker = createOfflinePosWorker;
const bullmq_1 = require("bullmq");
function createOfflinePosWorker(connection, container) {
    const worker = new bullmq_1.Worker('pos-offline-replay', async (job) => {
        const logger = console; // replace with shared-observability logger in production
        const { transactionId, items, customerEmail, customerId, totalCents, currency } = job.data;
        logger.log(`[offline-pos] Replaying transaction ${transactionId}`);
        // 1. Resolve or create customer in Medusa
        const cartModule = container.resolve('cart');
        const customerModule = container.resolve('customer');
        const orderModule = container.resolve('order');
        let resolvedCustomerId = customerId;
        if (!resolvedCustomerId && customerEmail) {
            const customers = await customerModule.listCustomers({ email: customerEmail }, { take: 1 });
            resolvedCustomerId = customers[0]?.id;
        }
        // 2. Create Medusa cart from offline items
        const cart = await cartModule.createCarts({
            currency_code: currency.toLowerCase(),
            customer_id: resolvedCustomerId,
            email: customerEmail,
            items: items.map(item => ({
                variant_id: item.variantId,
                quantity: item.quantity,
                unit_price: item.unitPriceCents / 100,
            })),
        });
        // 3. Complete cart → create order
        const order = await orderModule.createOrdersFromCart(cart.id);
        logger.log(`[offline-pos] Transaction ${transactionId} → Medusa order ${order.id}`);
        return { orderId: order.id, cartId: cart.id };
    }, {
        connection,
        concurrency: 3,
    });
    worker.on('completed', (job, result) => {
        console.log(`[offline-pos] Job ${job.id} completed → order ${result.orderId}`);
    });
    worker.on('failed', (job, err) => {
        console.error(`[offline-pos] Job ${job?.id} failed:`, err.message);
    });
    worker.on('error', (err) => {
        console.error('[erp-worker:offline-pos] Worker error:', err.message);
    });
    return worker;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoib2ZmbGluZS1wb3Mud29ya2VyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vc3JjL21vZHVsZXMvb2Rvby1zeW5jL3dvcmtlcnMvb2ZmbGluZS1wb3Mud29ya2VyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7O0FBdUJBLHdEQXlEQztBQWhGRCxtQ0FBb0M7QUF1QnBDLFNBQWdCLHNCQUFzQixDQUFDLFVBQWUsRUFBRSxTQUFjO0lBQ3BFLE1BQU0sTUFBTSxHQUFHLElBQUksZUFBTSxDQUN2QixvQkFBb0IsRUFDcEIsS0FBSyxFQUFFLEdBQThCLEVBQUUsRUFBRTtRQUN2QyxNQUFNLE1BQU0sR0FBRyxPQUFPLENBQUEsQ0FBRSx5REFBeUQ7UUFDakYsTUFBTSxFQUFFLGFBQWEsRUFBRSxLQUFLLEVBQUUsYUFBYSxFQUFFLFVBQVUsRUFBRSxVQUFVLEVBQUUsUUFBUSxFQUFFLEdBQUcsR0FBRyxDQUFDLElBQUksQ0FBQTtRQUUxRixNQUFNLENBQUMsR0FBRyxDQUFDLHVDQUF1QyxhQUFhLEVBQUUsQ0FBQyxDQUFBO1FBRWxFLDBDQUEwQztRQUMxQyxNQUFNLFVBQVUsR0FBRyxTQUFTLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxDQUFBO1FBQzVDLE1BQU0sY0FBYyxHQUFHLFNBQVMsQ0FBQyxPQUFPLENBQUMsVUFBVSxDQUFDLENBQUE7UUFDcEQsTUFBTSxXQUFXLEdBQUcsU0FBUyxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsQ0FBQTtRQUU5QyxJQUFJLGtCQUFrQixHQUFHLFVBQVUsQ0FBQTtRQUNuQyxJQUFJLENBQUMsa0JBQWtCLElBQUksYUFBYSxFQUFFLENBQUM7WUFDekMsTUFBTSxTQUFTLEdBQUcsTUFBTSxjQUFjLENBQUMsYUFBYSxDQUFDLEVBQUUsS0FBSyxFQUFFLGFBQWEsRUFBRSxFQUFFLEVBQUUsSUFBSSxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUE7WUFDM0Ysa0JBQWtCLEdBQUcsU0FBUyxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQTtRQUN2QyxDQUFDO1FBRUQsMkNBQTJDO1FBQzNDLE1BQU0sSUFBSSxHQUFHLE1BQU0sVUFBVSxDQUFDLFdBQVcsQ0FBQztZQUN4QyxhQUFhLEVBQUUsUUFBUSxDQUFDLFdBQVcsRUFBRTtZQUNyQyxXQUFXLEVBQUUsa0JBQWtCO1lBQy9CLEtBQUssRUFBRSxhQUFhO1lBQ3BCLEtBQUssRUFBRSxLQUFLLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQztnQkFDeEIsVUFBVSxFQUFFLElBQUksQ0FBQyxTQUFTO2dCQUMxQixRQUFRLEVBQUUsSUFBSSxDQUFDLFFBQVE7Z0JBQ3ZCLFVBQVUsRUFBRSxJQUFJLENBQUMsY0FBYyxHQUFHLEdBQUc7YUFDdEMsQ0FBQyxDQUFDO1NBQ0osQ0FBQyxDQUFBO1FBRUYsa0NBQWtDO1FBQ2xDLE1BQU0sS0FBSyxHQUFHLE1BQU0sV0FBVyxDQUFDLG9CQUFvQixDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQTtRQUU3RCxNQUFNLENBQUMsR0FBRyxDQUFDLDZCQUE2QixhQUFhLG1CQUFtQixLQUFLLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQTtRQUNuRixPQUFPLEVBQUUsT0FBTyxFQUFFLEtBQUssQ0FBQyxFQUFFLEVBQUUsTUFBTSxFQUFFLElBQUksQ0FBQyxFQUFFLEVBQUUsQ0FBQTtJQUMvQyxDQUFDLEVBQ0Q7UUFDRSxVQUFVO1FBQ1YsV0FBVyxFQUFFLENBQUM7S0FDZixDQUNGLENBQUE7SUFFRCxNQUFNLENBQUMsRUFBRSxDQUFDLFdBQVcsRUFBRSxDQUFDLEdBQUcsRUFBRSxNQUFNLEVBQUUsRUFBRTtRQUNyQyxPQUFPLENBQUMsR0FBRyxDQUFDLHFCQUFxQixHQUFHLENBQUMsRUFBRSxzQkFBc0IsTUFBTSxDQUFDLE9BQU8sRUFBRSxDQUFDLENBQUE7SUFDaEYsQ0FBQyxDQUFDLENBQUE7SUFFRixNQUFNLENBQUMsRUFBRSxDQUFDLFFBQVEsRUFBRSxDQUFDLEdBQUcsRUFBRSxHQUFHLEVBQUUsRUFBRTtRQUMvQixPQUFPLENBQUMsS0FBSyxDQUFDLHFCQUFxQixHQUFHLEVBQUUsRUFBRSxVQUFVLEVBQUUsR0FBRyxDQUFDLE9BQU8sQ0FBQyxDQUFBO0lBQ3BFLENBQUMsQ0FBQyxDQUFBO0lBRUYsTUFBTSxDQUFDLEVBQUUsQ0FBQyxPQUFPLEVBQUUsQ0FBQyxHQUFHLEVBQUUsRUFBRTtRQUN6QixPQUFPLENBQUMsS0FBSyxDQUFDLHdDQUF3QyxFQUFFLEdBQUcsQ0FBQyxPQUFPLENBQUMsQ0FBQTtJQUN0RSxDQUFDLENBQUMsQ0FBQTtJQUVGLE9BQU8sTUFBTSxDQUFBO0FBQ2YsQ0FBQyJ9