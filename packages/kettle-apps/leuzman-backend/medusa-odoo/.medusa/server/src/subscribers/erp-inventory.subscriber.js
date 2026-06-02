"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.config = void 0;
const index_js_1 = require("../modules/odoo-sync/index.js");
async function erpInventorySubscriber({ event: { name, data }, container, }) {
    const syncService = container.resolve(index_js_1.ODOO_SYNC_MODULE);
    const queue = syncService.resolveQueue('erpInventoryQueue');
    const inv = data;
    const payload = {
        entity_type: 'inventory',
        medusa_id: inv.id || inv.inventory_item_id,
        variant_id: inv.variant_id || inv.id,
        location_id: inv.location_id,
        quantity: inv.stocked_quantity ?? inv.quantity,
        operation: 'update',
        triggered_by: 'event',
        idempotency_key: `inventory:${inv.id}:${Date.now()}`,
    };
    await queue.add('inventory:update', payload, {
        jobId: `inv_${inv.id}_${inv.location_id}`,
        attempts: 5,
        backoff: { type: 'exponential', delay: 1000 },
        removeOnComplete: 200,
        removeOnFail: 50,
    });
}
exports.config = {
    event: [
        'inventory-item.updated',
        'inventory-level.updated',
        'inventory-level.created',
    ],
};
exports.default = erpInventorySubscriber;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXJwLWludmVudG9yeS5zdWJzY3JpYmVyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vc3JjL3N1YnNjcmliZXJzL2VycC1pbnZlbnRvcnkuc3Vic2NyaWJlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFHQSw0REFBaUY7QUFFakYsS0FBSyxVQUFVLHNCQUFzQixDQUFDLEVBQ3BDLEtBQUssRUFBRSxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsRUFDckIsU0FBUyxHQUMyQjtJQUNwQyxNQUFNLFdBQVcsR0FBb0IsU0FBUyxDQUFDLE9BQU8sQ0FBQywyQkFBZ0IsQ0FBQyxDQUFBO0lBQ3hFLE1BQU0sS0FBSyxHQUFVLFdBQVcsQ0FBQyxZQUFZLENBQUMsbUJBQW1CLENBQUMsQ0FBQTtJQUNsRSxNQUFNLEdBQUcsR0FBRyxJQUFXLENBQUE7SUFFdkIsTUFBTSxPQUFPLEdBQXdCO1FBQ25DLFdBQVcsRUFBTSxXQUFXO1FBQzVCLFNBQVMsRUFBUSxHQUFHLENBQUMsRUFBRSxJQUFJLEdBQUcsQ0FBQyxpQkFBaUI7UUFDaEQsVUFBVSxFQUFPLEdBQUcsQ0FBQyxVQUFVLElBQUksR0FBRyxDQUFDLEVBQUU7UUFDekMsV0FBVyxFQUFNLEdBQUcsQ0FBQyxXQUFXO1FBQ2hDLFFBQVEsRUFBUyxHQUFHLENBQUMsZ0JBQWdCLElBQUksR0FBRyxDQUFDLFFBQVE7UUFDckQsU0FBUyxFQUFRLFFBQVE7UUFDekIsWUFBWSxFQUFLLE9BQU87UUFDeEIsZUFBZSxFQUFFLGFBQWEsR0FBRyxDQUFDLEVBQUUsSUFBSSxJQUFJLENBQUMsR0FBRyxFQUFFLEVBQUU7S0FDckQsQ0FBQTtJQUVELE1BQU0sS0FBSyxDQUFDLEdBQUcsQ0FBQyxrQkFBa0IsRUFBRSxPQUFPLEVBQUU7UUFDM0MsS0FBSyxFQUFJLE9BQU8sR0FBRyxDQUFDLEVBQUUsSUFBSSxHQUFHLENBQUMsV0FBVyxFQUFFO1FBQzNDLFFBQVEsRUFBRSxDQUFDO1FBQ1gsT0FBTyxFQUFFLEVBQUUsSUFBSSxFQUFFLGFBQWEsRUFBRSxLQUFLLEVBQUUsSUFBSSxFQUFFO1FBQzdDLGdCQUFnQixFQUFFLEdBQUc7UUFDckIsWUFBWSxFQUFNLEVBQUU7S0FDckIsQ0FBQyxDQUFBO0FBQ0osQ0FBQztBQUVZLFFBQUEsTUFBTSxHQUFxQjtJQUN0QyxLQUFLLEVBQUU7UUFDTCx3QkFBd0I7UUFDeEIseUJBQXlCO1FBQ3pCLHlCQUF5QjtLQUMxQjtDQUNGLENBQUE7QUFFRCxrQkFBZSxzQkFBc0IsQ0FBQSJ9