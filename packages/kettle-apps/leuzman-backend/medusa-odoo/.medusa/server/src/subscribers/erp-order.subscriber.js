"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.config = void 0;
const index_js_1 = require("../modules/odoo-sync/index.js");
async function erpOrderSubscriber({ event: { name, data }, container, }) {
    const syncService = container.resolve(index_js_1.ODOO_SYNC_MODULE);
    const queue = syncService.resolveQueue('erpOrderQueue');
    const orderId = data.id;
    const operationMap = {
        'order.placed': 'create',
        'order.updated': 'update',
        'order.canceled': 'delete',
        'order.completed': 'update',
    };
    const operation = operationMap[name] ?? 'update';
    const payload = {
        entity_type: 'order',
        medusa_id: orderId,
        operation,
        triggered_by: 'event',
        idempotency_key: `order:${orderId}:${operation}:${Date.now()}`,
        data: data,
    };
    await queue.add(`order:${operation}`, payload, {
        jobId: `${orderId}_${operation}`,
        attempts: 3,
        backoff: { type: 'exponential', delay: 2000 },
        removeOnComplete: 100,
        removeOnFail: 50,
    });
}
exports.config = {
    event: ['order.placed', 'order.updated', 'order.canceled', 'order.completed'],
};
exports.default = erpOrderSubscriber;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXJwLW9yZGVyLnN1YnNjcmliZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi9zcmMvc3Vic2NyaWJlcnMvZXJwLW9yZGVyLnN1YnNjcmliZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBR0EsNERBQWlGO0FBRWpGLEtBQUssVUFBVSxrQkFBa0IsQ0FBQyxFQUNoQyxLQUFLLEVBQUUsRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLEVBQ3JCLFNBQVMsR0FDMkI7SUFDcEMsTUFBTSxXQUFXLEdBQW9CLFNBQVMsQ0FBQyxPQUFPLENBQUMsMkJBQWdCLENBQUMsQ0FBQTtJQUN4RSxNQUFNLEtBQUssR0FBVSxXQUFXLENBQUMsWUFBWSxDQUFDLGVBQWUsQ0FBQyxDQUFBO0lBQzlELE1BQU0sT0FBTyxHQUFZLElBQVksQ0FBQyxFQUFFLENBQUE7SUFFeEMsTUFBTSxZQUFZLEdBQW1EO1FBQ25FLGNBQWMsRUFBSyxRQUFRO1FBQzNCLGVBQWUsRUFBSSxRQUFRO1FBQzNCLGdCQUFnQixFQUFHLFFBQVE7UUFDM0IsaUJBQWlCLEVBQUUsUUFBUTtLQUM1QixDQUFBO0lBQ0QsTUFBTSxTQUFTLEdBQUcsWUFBWSxDQUFDLElBQUksQ0FBQyxJQUFJLFFBQVEsQ0FBQTtJQUVoRCxNQUFNLE9BQU8sR0FBb0I7UUFDL0IsV0FBVyxFQUFNLE9BQU87UUFDeEIsU0FBUyxFQUFRLE9BQU87UUFDeEIsU0FBUztRQUNULFlBQVksRUFBSyxPQUFPO1FBQ3hCLGVBQWUsRUFBRSxTQUFTLE9BQU8sSUFBSSxTQUFTLElBQUksSUFBSSxDQUFDLEdBQUcsRUFBRSxFQUFFO1FBQzlELElBQUksRUFBRSxJQUFXO0tBQ2xCLENBQUE7SUFFRCxNQUFNLEtBQUssQ0FBQyxHQUFHLENBQUMsU0FBUyxTQUFTLEVBQUUsRUFBRSxPQUFPLEVBQUU7UUFDN0MsS0FBSyxFQUFJLEdBQUcsT0FBTyxJQUFJLFNBQVMsRUFBRTtRQUNsQyxRQUFRLEVBQUUsQ0FBQztRQUNYLE9BQU8sRUFBRSxFQUFFLElBQUksRUFBRSxhQUFhLEVBQUUsS0FBSyxFQUFFLElBQUksRUFBRTtRQUM3QyxnQkFBZ0IsRUFBRSxHQUFHO1FBQ3JCLFlBQVksRUFBTSxFQUFFO0tBQ3JCLENBQUMsQ0FBQTtBQUNKLENBQUM7QUFFWSxRQUFBLE1BQU0sR0FBcUI7SUFDdEMsS0FBSyxFQUFFLENBQUMsY0FBYyxFQUFFLGVBQWUsRUFBRSxnQkFBZ0IsRUFBRSxpQkFBaUIsQ0FBQztDQUM5RSxDQUFBO0FBRUQsa0JBQWUsa0JBQWtCLENBQUEifQ==