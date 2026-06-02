"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ErpConflictResolution = void 0;
const utils_1 = require("@medusajs/framework/utils");
exports.ErpConflictResolution = utils_1.model.define('erp_conflict_resolution', {
    id: utils_1.model.id().primaryKey(),
    entity_type: utils_1.model.text(),
    entity_id: utils_1.model.text(),
    field_name: utils_1.model.text(),
    medusa_value: utils_1.model.json().nullable(),
    odoo_value: utils_1.model.json().nullable(),
    resolved_value: utils_1.model.json().nullable(),
    resolution_strategy: utils_1.model.text().default('pending'),
    auto_resolved: utils_1.model.boolean().default(false),
    resolved_at: utils_1.model.dateTime().nullable(),
    resolved_by: utils_1.model.text().nullable(),
    notes: utils_1.model.text().nullable(),
}).indexes([
    { on: ['entity_type', 'entity_id'] },
    { on: ['resolution_strategy'] },
]);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXJwLWNvbmZsaWN0LXJlc29sdXRpb24uanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi9zcmMvbW9kdWxlcy9vZG9vLXN5bmMvbW9kZWxzL2VycC1jb25mbGljdC1yZXNvbHV0aW9uLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUFBLHFEQUFpRDtBQUVwQyxRQUFBLHFCQUFxQixHQUFHLGFBQUssQ0FBQyxNQUFNLENBQUMseUJBQXlCLEVBQUU7SUFDM0UsRUFBRSxFQUFtQixhQUFLLENBQUMsRUFBRSxFQUFFLENBQUMsVUFBVSxFQUFFO0lBQzVDLFdBQVcsRUFBVSxhQUFLLENBQUMsSUFBSSxFQUFFO0lBQ2pDLFNBQVMsRUFBWSxhQUFLLENBQUMsSUFBSSxFQUFFO0lBQ2pDLFVBQVUsRUFBVyxhQUFLLENBQUMsSUFBSSxFQUFFO0lBQ2pDLFlBQVksRUFBUyxhQUFLLENBQUMsSUFBSSxFQUFFLENBQUMsUUFBUSxFQUFFO0lBQzVDLFVBQVUsRUFBVyxhQUFLLENBQUMsSUFBSSxFQUFFLENBQUMsUUFBUSxFQUFFO0lBQzVDLGNBQWMsRUFBTyxhQUFLLENBQUMsSUFBSSxFQUFFLENBQUMsUUFBUSxFQUFFO0lBQzVDLG1CQUFtQixFQUFFLGFBQUssQ0FBQyxJQUFJLEVBQUUsQ0FBQyxPQUFPLENBQUMsU0FBUyxDQUFDO0lBQ3BELGFBQWEsRUFBUSxhQUFLLENBQUMsT0FBTyxFQUFFLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQztJQUNuRCxXQUFXLEVBQVUsYUFBSyxDQUFDLFFBQVEsRUFBRSxDQUFDLFFBQVEsRUFBRTtJQUNoRCxXQUFXLEVBQVUsYUFBSyxDQUFDLElBQUksRUFBRSxDQUFDLFFBQVEsRUFBRTtJQUM1QyxLQUFLLEVBQWdCLGFBQUssQ0FBQyxJQUFJLEVBQUUsQ0FBQyxRQUFRLEVBQUU7Q0FDN0MsQ0FBQyxDQUFDLE9BQU8sQ0FBQztJQUNULEVBQUUsRUFBRSxFQUFFLENBQUMsYUFBYSxFQUFFLFdBQVcsQ0FBQyxFQUFFO0lBQ3BDLEVBQUUsRUFBRSxFQUFFLENBQUMscUJBQXFCLENBQUMsRUFBRTtDQUNoQyxDQUFDLENBQUEifQ==