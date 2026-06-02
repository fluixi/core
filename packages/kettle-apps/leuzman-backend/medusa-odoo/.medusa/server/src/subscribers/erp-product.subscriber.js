"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.config = void 0;
const index_js_1 = require("../modules/odoo-sync/index.js");
async function erpProductSubscriber({ event: { name, data }, container, }) {
    const syncService = container.resolve(index_js_1.ODOO_SYNC_MODULE);
    const queue = syncService.resolveQueue('erpProductQueue');
    const productId = data.id;
    const operationMap = {
        'product.created': 'create',
        'product.updated': 'update',
        'product.deleted': 'delete',
        'product-variant.created': 'create',
        'product-variant.updated': 'update',
        'product-variant.deleted': 'delete',
    };
    const operation = operationMap[name] ?? 'update';
    const idempotency_key = `product:${productId}:${operation}:${Date.now()}`;
    const payload = {
        entity_type: 'product',
        medusa_id: productId,
        operation,
        triggered_by: 'event',
        idempotency_key,
        data: data,
    };
    await queue.add(`product:${operation}`, payload, {
        jobId: `${productId}_${operation}`,
        attempts: 3,
        backoff: { type: 'exponential', delay: 2000 },
        removeOnComplete: 100,
        removeOnFail: 50,
    });
}
exports.config = {
    event: [
        'product.created',
        'product.updated',
        'product.deleted',
        'product-variant.created',
        'product-variant.updated',
        'product-variant.deleted',
    ],
};
exports.default = erpProductSubscriber;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXJwLXByb2R1Y3Quc3Vic2NyaWJlci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uL3NyYy9zdWJzY3JpYmVycy9lcnAtcHJvZHVjdC5zdWJzY3JpYmVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUdBLDREQUFpRjtBQUdqRixLQUFLLFVBQVUsb0JBQW9CLENBQUMsRUFDbEMsS0FBSyxFQUFFLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSxFQUNyQixTQUFTLEdBQzJCO0lBQ3BDLE1BQU0sV0FBVyxHQUFvQixTQUFTLENBQUMsT0FBTyxDQUFDLDJCQUFnQixDQUFDLENBQUE7SUFDeEUsTUFBTSxLQUFLLEdBQVUsV0FBVyxDQUFDLFlBQVksQ0FBQyxpQkFBaUIsQ0FBQyxDQUFBO0lBQ2hFLE1BQU0sU0FBUyxHQUFZLElBQVksQ0FBQyxFQUFFLENBQUE7SUFFMUMsTUFBTSxZQUFZLEdBQW1EO1FBQ25FLGlCQUFpQixFQUFVLFFBQVE7UUFDbkMsaUJBQWlCLEVBQVUsUUFBUTtRQUNuQyxpQkFBaUIsRUFBVSxRQUFRO1FBQ25DLHlCQUF5QixFQUFFLFFBQVE7UUFDbkMseUJBQXlCLEVBQUUsUUFBUTtRQUNuQyx5QkFBeUIsRUFBRSxRQUFRO0tBQ3BDLENBQUE7SUFDRCxNQUFNLFNBQVMsR0FBRyxZQUFZLENBQUMsSUFBSSxDQUFDLElBQUksUUFBUSxDQUFBO0lBQ2hELE1BQU0sZUFBZSxHQUFHLFdBQVcsU0FBUyxJQUFJLFNBQVMsSUFBSSxJQUFJLENBQUMsR0FBRyxFQUFFLEVBQUUsQ0FBQTtJQUV6RSxNQUFNLE9BQU8sR0FBc0I7UUFDakMsV0FBVyxFQUFNLFNBQVM7UUFDMUIsU0FBUyxFQUFRLFNBQVM7UUFDMUIsU0FBUztRQUNULFlBQVksRUFBSyxPQUFPO1FBQ3hCLGVBQWU7UUFDZixJQUFJLEVBQUUsSUFBVztLQUNsQixDQUFBO0lBRUQsTUFBTSxLQUFLLENBQUMsR0FBRyxDQUFDLFdBQVcsU0FBUyxFQUFFLEVBQUUsT0FBTyxFQUFFO1FBQy9DLEtBQUssRUFBSSxHQUFHLFNBQVMsSUFBSSxTQUFTLEVBQUU7UUFDcEMsUUFBUSxFQUFFLENBQUM7UUFDWCxPQUFPLEVBQUUsRUFBRSxJQUFJLEVBQUUsYUFBYSxFQUFFLEtBQUssRUFBRSxJQUFJLEVBQUU7UUFDN0MsZ0JBQWdCLEVBQUUsR0FBRztRQUNyQixZQUFZLEVBQU0sRUFBRTtLQUNyQixDQUFDLENBQUE7QUFDSixDQUFDO0FBRVksUUFBQSxNQUFNLEdBQXFCO0lBQ3RDLEtBQUssRUFBRTtRQUNMLGlCQUFpQjtRQUNqQixpQkFBaUI7UUFDakIsaUJBQWlCO1FBQ2pCLHlCQUF5QjtRQUN6Qix5QkFBeUI7UUFDekIseUJBQXlCO0tBQzFCO0NBQ0YsQ0FBQTtBQUVELGtCQUFlLG9CQUFvQixDQUFBIn0=