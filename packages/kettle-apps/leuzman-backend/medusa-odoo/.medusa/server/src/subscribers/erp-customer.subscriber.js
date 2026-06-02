"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.config = void 0;
const index_js_1 = require("../modules/odoo-sync/index.js");
async function erpCustomerSubscriber({ event: { name, data }, container, }) {
    const syncService = container.resolve(index_js_1.ODOO_SYNC_MODULE);
    const queue = syncService.resolveQueue('erpCustomerQueue');
    const customer = data;
    const operationMap = {
        'customer.created': 'create',
        'customer.updated': 'update',
        'customer.deleted': 'delete',
    };
    const operation = operationMap[name] ?? 'update';
    const payload = {
        entity_type: 'customer',
        medusa_id: customer.id,
        operation,
        triggered_by: 'event',
        idempotency_key: `customer:${customer.id}:${operation}:${Date.now()}`,
        data: customer,
    };
    await queue.add(`customer:${operation}`, payload, {
        jobId: `${customer.id}_${operation}`,
        attempts: 3,
        backoff: { type: 'exponential', delay: 1000 },
        removeOnComplete: 100,
        removeOnFail: 50,
    });
}
exports.config = {
    event: ['customer.created', 'customer.updated', 'customer.deleted'],
};
exports.default = erpCustomerSubscriber;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXJwLWN1c3RvbWVyLnN1YnNjcmliZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi9zcmMvc3Vic2NyaWJlcnMvZXJwLWN1c3RvbWVyLnN1YnNjcmliZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBR0EsNERBQWlGO0FBRWpGLEtBQUssVUFBVSxxQkFBcUIsQ0FBQyxFQUNuQyxLQUFLLEVBQUUsRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLEVBQ3JCLFNBQVMsR0FDMkI7SUFDcEMsTUFBTSxXQUFXLEdBQW9CLFNBQVMsQ0FBQyxPQUFPLENBQUMsMkJBQWdCLENBQUMsQ0FBQTtJQUN4RSxNQUFNLEtBQUssR0FBVSxXQUFXLENBQUMsWUFBWSxDQUFDLGtCQUFrQixDQUFDLENBQUE7SUFDakUsTUFBTSxRQUFRLEdBQUcsSUFBVyxDQUFBO0lBRTVCLE1BQU0sWUFBWSxHQUFtRDtRQUNuRSxrQkFBa0IsRUFBRSxRQUFRO1FBQzVCLGtCQUFrQixFQUFFLFFBQVE7UUFDNUIsa0JBQWtCLEVBQUUsUUFBUTtLQUM3QixDQUFBO0lBQ0QsTUFBTSxTQUFTLEdBQUcsWUFBWSxDQUFDLElBQUksQ0FBQyxJQUFJLFFBQVEsQ0FBQTtJQUVoRCxNQUFNLE9BQU8sR0FBdUI7UUFDbEMsV0FBVyxFQUFNLFVBQVU7UUFDM0IsU0FBUyxFQUFRLFFBQVEsQ0FBQyxFQUFFO1FBQzVCLFNBQVM7UUFDVCxZQUFZLEVBQUssT0FBTztRQUN4QixlQUFlLEVBQUUsWUFBWSxRQUFRLENBQUMsRUFBRSxJQUFJLFNBQVMsSUFBSSxJQUFJLENBQUMsR0FBRyxFQUFFLEVBQUU7UUFDckUsSUFBSSxFQUFFLFFBQVE7S0FDZixDQUFBO0lBRUQsTUFBTSxLQUFLLENBQUMsR0FBRyxDQUFDLFlBQVksU0FBUyxFQUFFLEVBQUUsT0FBTyxFQUFFO1FBQ2hELEtBQUssRUFBSSxHQUFHLFFBQVEsQ0FBQyxFQUFFLElBQUksU0FBUyxFQUFFO1FBQ3RDLFFBQVEsRUFBRSxDQUFDO1FBQ1gsT0FBTyxFQUFFLEVBQUUsSUFBSSxFQUFFLGFBQWEsRUFBRSxLQUFLLEVBQUUsSUFBSSxFQUFFO1FBQzdDLGdCQUFnQixFQUFFLEdBQUc7UUFDckIsWUFBWSxFQUFNLEVBQUU7S0FDckIsQ0FBQyxDQUFBO0FBQ0osQ0FBQztBQUVZLFFBQUEsTUFBTSxHQUFxQjtJQUN0QyxLQUFLLEVBQUUsQ0FBQyxrQkFBa0IsRUFBRSxrQkFBa0IsRUFBRSxrQkFBa0IsQ0FBQztDQUNwRSxDQUFBO0FBRUQsa0JBQWUscUJBQXFCLENBQUEifQ==