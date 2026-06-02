"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ErpSyncFailure = void 0;
const utils_1 = require("@medusajs/framework/utils");
exports.ErpSyncFailure = utils_1.model.define('erp_sync_failure', {
    id: utils_1.model.id().primaryKey(),
    queue: utils_1.model.text(),
    job_id: utils_1.model.text().nullable(),
    entity_type: utils_1.model.text(),
    entity_id: utils_1.model.text(),
    operation: utils_1.model.text(),
    direction: utils_1.model.text().default('medusa_to_odoo'),
    trigger: utils_1.model.text().default('event'),
    payload: utils_1.model.json(),
    error_message: utils_1.model.text(),
    error_code: utils_1.model.text().nullable(),
    error_stack: utils_1.model.text().nullable(),
    attempt_count: utils_1.model.number().default(1),
    next_retry_at: utils_1.model.dateTime().nullable(),
    resolved: utils_1.model.boolean().default(false),
    resolved_at: utils_1.model.dateTime().nullable(),
    resolved_by: utils_1.model.text().nullable(),
}).indexes([
    { on: ['entity_type', 'entity_id'] },
    { on: ['resolved'] },
    { on: ['next_retry_at'] },
]);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXJwLXN5bmMtZmFpbHVyZS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uL3NyYy9tb2R1bGVzL29kb28tc3luYy9tb2RlbHMvZXJwLXN5bmMtZmFpbHVyZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFBQSxxREFBaUQ7QUFFcEMsUUFBQSxjQUFjLEdBQUcsYUFBSyxDQUFDLE1BQU0sQ0FBQyxrQkFBa0IsRUFBRTtJQUM3RCxFQUFFLEVBQWMsYUFBSyxDQUFDLEVBQUUsRUFBRSxDQUFDLFVBQVUsRUFBRTtJQUN2QyxLQUFLLEVBQVcsYUFBSyxDQUFDLElBQUksRUFBRTtJQUM1QixNQUFNLEVBQVUsYUFBSyxDQUFDLElBQUksRUFBRSxDQUFDLFFBQVEsRUFBRTtJQUN2QyxXQUFXLEVBQUssYUFBSyxDQUFDLElBQUksRUFBRTtJQUM1QixTQUFTLEVBQU8sYUFBSyxDQUFDLElBQUksRUFBRTtJQUM1QixTQUFTLEVBQU8sYUFBSyxDQUFDLElBQUksRUFBRTtJQUM1QixTQUFTLEVBQU8sYUFBSyxDQUFDLElBQUksRUFBRSxDQUFDLE9BQU8sQ0FBQyxnQkFBZ0IsQ0FBQztJQUN0RCxPQUFPLEVBQVMsYUFBSyxDQUFDLElBQUksRUFBRSxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUM7SUFDN0MsT0FBTyxFQUFTLGFBQUssQ0FBQyxJQUFJLEVBQUU7SUFDNUIsYUFBYSxFQUFHLGFBQUssQ0FBQyxJQUFJLEVBQUU7SUFDNUIsVUFBVSxFQUFNLGFBQUssQ0FBQyxJQUFJLEVBQUUsQ0FBQyxRQUFRLEVBQUU7SUFDdkMsV0FBVyxFQUFLLGFBQUssQ0FBQyxJQUFJLEVBQUUsQ0FBQyxRQUFRLEVBQUU7SUFDdkMsYUFBYSxFQUFHLGFBQUssQ0FBQyxNQUFNLEVBQUUsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDO0lBQ3pDLGFBQWEsRUFBRyxhQUFLLENBQUMsUUFBUSxFQUFFLENBQUMsUUFBUSxFQUFFO0lBQzNDLFFBQVEsRUFBUSxhQUFLLENBQUMsT0FBTyxFQUFFLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQztJQUM5QyxXQUFXLEVBQUssYUFBSyxDQUFDLFFBQVEsRUFBRSxDQUFDLFFBQVEsRUFBRTtJQUMzQyxXQUFXLEVBQUssYUFBSyxDQUFDLElBQUksRUFBRSxDQUFDLFFBQVEsRUFBRTtDQUN4QyxDQUFDLENBQUMsT0FBTyxDQUFDO0lBQ1QsRUFBRSxFQUFFLEVBQUUsQ0FBQyxhQUFhLEVBQUUsV0FBVyxDQUFDLEVBQUU7SUFDcEMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxVQUFVLENBQUMsRUFBRTtJQUNwQixFQUFFLEVBQUUsRUFBRSxDQUFDLGVBQWUsQ0FBQyxFQUFFO0NBQzFCLENBQUMsQ0FBQSJ9