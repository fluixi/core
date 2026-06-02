"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ErpReconciliationLog = void 0;
const utils_1 = require("@medusajs/framework/utils");
exports.ErpReconciliationLog = utils_1.model.define('erp_reconciliation_log', {
    id: utils_1.model.id().primaryKey(),
    reconciliation_type: utils_1.model.text(),
    triggered_by: utils_1.model.text(),
    started_at: utils_1.model.dateTime(),
    completed_at: utils_1.model.dateTime().nullable(),
    status: utils_1.model.text().default('running'),
    total_checked: utils_1.model.number().default(0),
    total_matched: utils_1.model.number().default(0),
    total_drifted: utils_1.model.number().default(0),
    total_fixed: utils_1.model.number().default(0),
    total_conflicts: utils_1.model.number().default(0),
    error_message: utils_1.model.text().nullable(),
    report: utils_1.model.json().nullable(),
}).indexes([
    { on: ['reconciliation_type'] },
    { on: ['status'] },
]);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXJwLXJlY29uY2lsaWF0aW9uLWxvZy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uL3NyYy9tb2R1bGVzL29kb28tc3luYy9tb2RlbHMvZXJwLXJlY29uY2lsaWF0aW9uLWxvZy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFBQSxxREFBaUQ7QUFFcEMsUUFBQSxvQkFBb0IsR0FBRyxhQUFLLENBQUMsTUFBTSxDQUFDLHdCQUF3QixFQUFFO0lBQ3pFLEVBQUUsRUFBbUIsYUFBSyxDQUFDLEVBQUUsRUFBRSxDQUFDLFVBQVUsRUFBRTtJQUM1QyxtQkFBbUIsRUFBRSxhQUFLLENBQUMsSUFBSSxFQUFFO0lBQ2pDLFlBQVksRUFBUyxhQUFLLENBQUMsSUFBSSxFQUFFO0lBQ2pDLFVBQVUsRUFBVyxhQUFLLENBQUMsUUFBUSxFQUFFO0lBQ3JDLFlBQVksRUFBUyxhQUFLLENBQUMsUUFBUSxFQUFFLENBQUMsUUFBUSxFQUFFO0lBQ2hELE1BQU0sRUFBZSxhQUFLLENBQUMsSUFBSSxFQUFFLENBQUMsT0FBTyxDQUFDLFNBQVMsQ0FBQztJQUNwRCxhQUFhLEVBQVEsYUFBSyxDQUFDLE1BQU0sRUFBRSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUM7SUFDOUMsYUFBYSxFQUFRLGFBQUssQ0FBQyxNQUFNLEVBQUUsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDO0lBQzlDLGFBQWEsRUFBUSxhQUFLLENBQUMsTUFBTSxFQUFFLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQztJQUM5QyxXQUFXLEVBQVUsYUFBSyxDQUFDLE1BQU0sRUFBRSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUM7SUFDOUMsZUFBZSxFQUFNLGFBQUssQ0FBQyxNQUFNLEVBQUUsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDO0lBQzlDLGFBQWEsRUFBUSxhQUFLLENBQUMsSUFBSSxFQUFFLENBQUMsUUFBUSxFQUFFO0lBQzVDLE1BQU0sRUFBZSxhQUFLLENBQUMsSUFBSSxFQUFFLENBQUMsUUFBUSxFQUFFO0NBQzdDLENBQUMsQ0FBQyxPQUFPLENBQUM7SUFDVCxFQUFFLEVBQUUsRUFBRSxDQUFDLHFCQUFxQixDQUFDLEVBQUU7SUFDL0IsRUFBRSxFQUFFLEVBQUUsQ0FBQyxRQUFRLENBQUMsRUFBRTtDQUNuQixDQUFDLENBQUEifQ==