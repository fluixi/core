"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ErpInventorySnapshot = void 0;
const utils_1 = require("@medusajs/framework/utils");
exports.ErpInventorySnapshot = utils_1.model.define('erp_inventory_snapshot', {
    id: utils_1.model.id().primaryKey(),
    product_id: utils_1.model.text(),
    variant_id: utils_1.model.text(),
    location_id: utils_1.model.text(),
    odoo_location_id: utils_1.model.number().nullable(),
    quantity_medusa: utils_1.model.number().default(0),
    quantity_odoo: utils_1.model.number().default(0),
    snapshot_at: utils_1.model.dateTime(),
    reconciled: utils_1.model.boolean().default(false),
    reconciled_at: utils_1.model.dateTime().nullable(),
    drift_threshold_exceeded: utils_1.model.boolean().default(false),
    metadata: utils_1.model.json().nullable(),
}).indexes([
    { on: ['variant_id'] },
    { on: ['location_id'] },
    { on: ['reconciled'] },
]);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXJwLWludmVudG9yeS1zbmFwc2hvdC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uL3NyYy9tb2R1bGVzL29kb28tc3luYy9tb2RlbHMvZXJwLWludmVudG9yeS1zbmFwc2hvdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFBQSxxREFBaUQ7QUFFcEMsUUFBQSxvQkFBb0IsR0FBRyxhQUFLLENBQUMsTUFBTSxDQUFDLHdCQUF3QixFQUFFO0lBQ3pFLEVBQUUsRUFBd0IsYUFBSyxDQUFDLEVBQUUsRUFBRSxDQUFDLFVBQVUsRUFBRTtJQUNqRCxVQUFVLEVBQWdCLGFBQUssQ0FBQyxJQUFJLEVBQUU7SUFDdEMsVUFBVSxFQUFnQixhQUFLLENBQUMsSUFBSSxFQUFFO0lBQ3RDLFdBQVcsRUFBZSxhQUFLLENBQUMsSUFBSSxFQUFFO0lBQ3RDLGdCQUFnQixFQUFVLGFBQUssQ0FBQyxNQUFNLEVBQUUsQ0FBQyxRQUFRLEVBQUU7SUFDbkQsZUFBZSxFQUFXLGFBQUssQ0FBQyxNQUFNLEVBQUUsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDO0lBQ25ELGFBQWEsRUFBYSxhQUFLLENBQUMsTUFBTSxFQUFFLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQztJQUNuRCxXQUFXLEVBQWUsYUFBSyxDQUFDLFFBQVEsRUFBRTtJQUMxQyxVQUFVLEVBQWdCLGFBQUssQ0FBQyxPQUFPLEVBQUUsQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDO0lBQ3hELGFBQWEsRUFBYSxhQUFLLENBQUMsUUFBUSxFQUFFLENBQUMsUUFBUSxFQUFFO0lBQ3JELHdCQUF3QixFQUFFLGFBQUssQ0FBQyxPQUFPLEVBQUUsQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDO0lBQ3hELFFBQVEsRUFBa0IsYUFBSyxDQUFDLElBQUksRUFBRSxDQUFDLFFBQVEsRUFBRTtDQUNsRCxDQUFDLENBQUMsT0FBTyxDQUFDO0lBQ1QsRUFBRSxFQUFFLEVBQUUsQ0FBQyxZQUFZLENBQUMsRUFBRTtJQUN0QixFQUFFLEVBQUUsRUFBRSxDQUFDLGFBQWEsQ0FBQyxFQUFFO0lBQ3ZCLEVBQUUsRUFBRSxFQUFFLENBQUMsWUFBWSxDQUFDLEVBQUU7Q0FDdkIsQ0FBQyxDQUFBIn0=