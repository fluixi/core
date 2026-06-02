"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ErpSyncLog = void 0;
const utils_1 = require("@medusajs/framework/utils");
exports.ErpSyncLog = utils_1.model.define('erp_sync_log', {
    id: utils_1.model.id().primaryKey(),
    entity_type: utils_1.model.text(),
    entity_id: utils_1.model.text(),
    operation: utils_1.model.text(),
    direction: utils_1.model.text(),
    status: utils_1.model.text(),
    trigger: utils_1.model.text(),
    idempotency_key: utils_1.model.text().nullable(),
    duration_ms: utils_1.model.number().nullable(),
    error_message: utils_1.model.text().nullable(),
    error_code: utils_1.model.text().nullable(),
    odoo_id: utils_1.model.number().nullable(),
    odoo_model: utils_1.model.text().nullable(),
    attempt: utils_1.model.number().default(1),
    payload: utils_1.model.json().nullable(),
    started_at: utils_1.model.dateTime().nullable(),
    completed_at: utils_1.model.dateTime().nullable(),
    metadata: utils_1.model.json().nullable(),
}).indexes([
    { on: ['entity_type', 'entity_id'] },
    { on: ['status'] },
    { on: ['trigger'] },
]);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXJwLXN5bmMtbG9nLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vc3JjL21vZHVsZXMvb2Rvby1zeW5jL21vZGVscy9lcnAtc3luYy1sb2cudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQUEscURBQWlEO0FBRXBDLFFBQUEsVUFBVSxHQUFHLGFBQUssQ0FBQyxNQUFNLENBQUMsY0FBYyxFQUFFO0lBQ3JELEVBQUUsRUFBZSxhQUFLLENBQUMsRUFBRSxFQUFFLENBQUMsVUFBVSxFQUFFO0lBQ3hDLFdBQVcsRUFBTSxhQUFLLENBQUMsSUFBSSxFQUFFO0lBQzdCLFNBQVMsRUFBUSxhQUFLLENBQUMsSUFBSSxFQUFFO0lBQzdCLFNBQVMsRUFBUSxhQUFLLENBQUMsSUFBSSxFQUFFO0lBQzdCLFNBQVMsRUFBUSxhQUFLLENBQUMsSUFBSSxFQUFFO0lBQzdCLE1BQU0sRUFBVyxhQUFLLENBQUMsSUFBSSxFQUFFO0lBQzdCLE9BQU8sRUFBVSxhQUFLLENBQUMsSUFBSSxFQUFFO0lBQzdCLGVBQWUsRUFBRSxhQUFLLENBQUMsSUFBSSxFQUFFLENBQUMsUUFBUSxFQUFFO0lBQ3hDLFdBQVcsRUFBTSxhQUFLLENBQUMsTUFBTSxFQUFFLENBQUMsUUFBUSxFQUFFO0lBQzFDLGFBQWEsRUFBSSxhQUFLLENBQUMsSUFBSSxFQUFFLENBQUMsUUFBUSxFQUFFO0lBQ3hDLFVBQVUsRUFBTyxhQUFLLENBQUMsSUFBSSxFQUFFLENBQUMsUUFBUSxFQUFFO0lBQ3hDLE9BQU8sRUFBVSxhQUFLLENBQUMsTUFBTSxFQUFFLENBQUMsUUFBUSxFQUFFO0lBQzFDLFVBQVUsRUFBTyxhQUFLLENBQUMsSUFBSSxFQUFFLENBQUMsUUFBUSxFQUFFO0lBQ3hDLE9BQU8sRUFBVSxhQUFLLENBQUMsTUFBTSxFQUFFLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQztJQUMxQyxPQUFPLEVBQVUsYUFBSyxDQUFDLElBQUksRUFBRSxDQUFDLFFBQVEsRUFBRTtJQUN4QyxVQUFVLEVBQU8sYUFBSyxDQUFDLFFBQVEsRUFBRSxDQUFDLFFBQVEsRUFBRTtJQUM1QyxZQUFZLEVBQUssYUFBSyxDQUFDLFFBQVEsRUFBRSxDQUFDLFFBQVEsRUFBRTtJQUM1QyxRQUFRLEVBQVMsYUFBSyxDQUFDLElBQUksRUFBRSxDQUFDLFFBQVEsRUFBRTtDQUN6QyxDQUFDLENBQUMsT0FBTyxDQUFDO0lBQ1QsRUFBRSxFQUFFLEVBQUUsQ0FBQyxhQUFhLEVBQUUsV0FBVyxDQUFDLEVBQUU7SUFDcEMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxRQUFRLENBQUMsRUFBRTtJQUNsQixFQUFFLEVBQUUsRUFBRSxDQUFDLFNBQVMsQ0FBQyxFQUFFO0NBQ3BCLENBQUMsQ0FBQSJ9