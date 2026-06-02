"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OfflinePosTransaction = void 0;
const utils_1 = require("@medusajs/framework/utils");
exports.OfflinePosTransaction = utils_1.model.define('offline_pos_transaction', {
    id: utils_1.model.id().primaryKey(),
    device_id: utils_1.model.text(),
    session_id: utils_1.model.text(),
    pos_location_id: utils_1.model.text().nullable(),
    cart_id: utils_1.model.text().nullable(),
    status: utils_1.model.text().default('pending'),
    items: utils_1.model.json(),
    customer_email: utils_1.model.text().nullable(),
    customer_id: utils_1.model.text().nullable(),
    subtotal_cents: utils_1.model.number().default(0),
    tax_cents: utils_1.model.number().default(0),
    total_cents: utils_1.model.number().default(0),
    currency: utils_1.model.text().default('USD'),
    payment_method: utils_1.model.text().nullable(),
    payment_data: utils_1.model.json().nullable(),
    discount_code: utils_1.model.text().nullable(),
    discount_cents: utils_1.model.number().default(0),
    captured_at: utils_1.model.dateTime(),
    replayed_at: utils_1.model.dateTime().nullable(),
    replay_attempt_count: utils_1.model.number().default(0),
    last_replay_at: utils_1.model.dateTime().nullable(),
    next_replay_at: utils_1.model.dateTime().nullable(),
    replay_error: utils_1.model.text().nullable(),
    medusa_order_id: utils_1.model.text().nullable(),
    odoo_order_id: utils_1.model.number().nullable(),
    metadata: utils_1.model.json().nullable(),
}).indexes([
    { on: ['status'] },
    { on: ['device_id'] },
    { on: ['session_id'] },
    { on: ['next_replay_at'] },
]);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoib2ZmbGluZS1wb3MtdHJhbnNhY3Rpb24uanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi9zcmMvbW9kdWxlcy9vZG9vLXN5bmMvbW9kZWxzL29mZmxpbmUtcG9zLXRyYW5zYWN0aW9uLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUFBLHFEQUFpRDtBQUVwQyxRQUFBLHFCQUFxQixHQUFHLGFBQUssQ0FBQyxNQUFNLENBQUMseUJBQXlCLEVBQUU7SUFDM0UsRUFBRSxFQUFvQixhQUFLLENBQUMsRUFBRSxFQUFFLENBQUMsVUFBVSxFQUFFO0lBQzdDLFNBQVMsRUFBYSxhQUFLLENBQUMsSUFBSSxFQUFFO0lBQ2xDLFVBQVUsRUFBWSxhQUFLLENBQUMsSUFBSSxFQUFFO0lBQ2xDLGVBQWUsRUFBTyxhQUFLLENBQUMsSUFBSSxFQUFFLENBQUMsUUFBUSxFQUFFO0lBQzdDLE9BQU8sRUFBZSxhQUFLLENBQUMsSUFBSSxFQUFFLENBQUMsUUFBUSxFQUFFO0lBQzdDLE1BQU0sRUFBZ0IsYUFBSyxDQUFDLElBQUksRUFBRSxDQUFDLE9BQU8sQ0FBQyxTQUFTLENBQUM7SUFDckQsS0FBSyxFQUFpQixhQUFLLENBQUMsSUFBSSxFQUFFO0lBQ2xDLGNBQWMsRUFBUSxhQUFLLENBQUMsSUFBSSxFQUFFLENBQUMsUUFBUSxFQUFFO0lBQzdDLFdBQVcsRUFBVyxhQUFLLENBQUMsSUFBSSxFQUFFLENBQUMsUUFBUSxFQUFFO0lBQzdDLGNBQWMsRUFBUSxhQUFLLENBQUMsTUFBTSxFQUFFLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQztJQUMvQyxTQUFTLEVBQWEsYUFBSyxDQUFDLE1BQU0sRUFBRSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUM7SUFDL0MsV0FBVyxFQUFXLGFBQUssQ0FBQyxNQUFNLEVBQUUsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDO0lBQy9DLFFBQVEsRUFBYyxhQUFLLENBQUMsSUFBSSxFQUFFLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQztJQUNqRCxjQUFjLEVBQVEsYUFBSyxDQUFDLElBQUksRUFBRSxDQUFDLFFBQVEsRUFBRTtJQUM3QyxZQUFZLEVBQVUsYUFBSyxDQUFDLElBQUksRUFBRSxDQUFDLFFBQVEsRUFBRTtJQUM3QyxhQUFhLEVBQVMsYUFBSyxDQUFDLElBQUksRUFBRSxDQUFDLFFBQVEsRUFBRTtJQUM3QyxjQUFjLEVBQVEsYUFBSyxDQUFDLE1BQU0sRUFBRSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUM7SUFDL0MsV0FBVyxFQUFXLGFBQUssQ0FBQyxRQUFRLEVBQUU7SUFDdEMsV0FBVyxFQUFXLGFBQUssQ0FBQyxRQUFRLEVBQUUsQ0FBQyxRQUFRLEVBQUU7SUFDakQsb0JBQW9CLEVBQUUsYUFBSyxDQUFDLE1BQU0sRUFBRSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUM7SUFDL0MsY0FBYyxFQUFRLGFBQUssQ0FBQyxRQUFRLEVBQUUsQ0FBQyxRQUFRLEVBQUU7SUFDakQsY0FBYyxFQUFRLGFBQUssQ0FBQyxRQUFRLEVBQUUsQ0FBQyxRQUFRLEVBQUU7SUFDakQsWUFBWSxFQUFVLGFBQUssQ0FBQyxJQUFJLEVBQUUsQ0FBQyxRQUFRLEVBQUU7SUFDN0MsZUFBZSxFQUFPLGFBQUssQ0FBQyxJQUFJLEVBQUUsQ0FBQyxRQUFRLEVBQUU7SUFDN0MsYUFBYSxFQUFTLGFBQUssQ0FBQyxNQUFNLEVBQUUsQ0FBQyxRQUFRLEVBQUU7SUFDL0MsUUFBUSxFQUFjLGFBQUssQ0FBQyxJQUFJLEVBQUUsQ0FBQyxRQUFRLEVBQUU7Q0FDOUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQztJQUNULEVBQUUsRUFBRSxFQUFFLENBQUMsUUFBUSxDQUFDLEVBQUU7SUFDbEIsRUFBRSxFQUFFLEVBQUUsQ0FBQyxXQUFXLENBQUMsRUFBRTtJQUNyQixFQUFFLEVBQUUsRUFBRSxDQUFDLFlBQVksQ0FBQyxFQUFFO0lBQ3RCLEVBQUUsRUFBRSxFQUFFLENBQUMsZ0JBQWdCLENBQUMsRUFBRTtDQUMzQixDQUFDLENBQUEifQ==