"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ErpMapping = void 0;
const utils_1 = require("@medusajs/framework/utils");
exports.ErpMapping = utils_1.model.define('erp_mapping', {
    id: utils_1.model.id().primaryKey(),
    entity_type: utils_1.model.text(),
    medusa_id: utils_1.model.text(),
    odoo_id: utils_1.model.number(),
    odoo_model: utils_1.model.text(),
    sync_direction: utils_1.model.text().default('bidirectional'),
    status: utils_1.model.text().default('active'),
    sync_version: utils_1.model.number().default(1),
    last_synced_at: utils_1.model.dateTime().nullable(),
    metadata: utils_1.model.json().nullable(),
}).indexes([
    { on: ['entity_type', 'medusa_id'], unique: true },
    { on: ['entity_type', 'odoo_id'] },
    { on: ['status'] },
]);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXJwLW1hcHBpbmcuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi9zcmMvbW9kdWxlcy9vZG9vLXN5bmMvbW9kZWxzL2VycC1tYXBwaW5nLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUFBLHFEQUFpRDtBQUVwQyxRQUFBLFVBQVUsR0FBRyxhQUFLLENBQUMsTUFBTSxDQUFDLGFBQWEsRUFBRTtJQUNwRCxFQUFFLEVBQWEsYUFBSyxDQUFDLEVBQUUsRUFBRSxDQUFDLFVBQVUsRUFBRTtJQUN0QyxXQUFXLEVBQUksYUFBSyxDQUFDLElBQUksRUFBRTtJQUMzQixTQUFTLEVBQU0sYUFBSyxDQUFDLElBQUksRUFBRTtJQUMzQixPQUFPLEVBQVEsYUFBSyxDQUFDLE1BQU0sRUFBRTtJQUM3QixVQUFVLEVBQUssYUFBSyxDQUFDLElBQUksRUFBRTtJQUMzQixjQUFjLEVBQUUsYUFBSyxDQUFDLElBQUksRUFBRSxDQUFDLE9BQU8sQ0FBQyxlQUFlLENBQUM7SUFDckQsTUFBTSxFQUFTLGFBQUssQ0FBQyxJQUFJLEVBQUUsQ0FBQyxPQUFPLENBQUMsUUFBUSxDQUFDO0lBQzdDLFlBQVksRUFBRyxhQUFLLENBQUMsTUFBTSxFQUFFLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQztJQUN4QyxjQUFjLEVBQUUsYUFBSyxDQUFDLFFBQVEsRUFBRSxDQUFDLFFBQVEsRUFBRTtJQUMzQyxRQUFRLEVBQU8sYUFBSyxDQUFDLElBQUksRUFBRSxDQUFDLFFBQVEsRUFBRTtDQUN2QyxDQUFDLENBQUMsT0FBTyxDQUFDO0lBQ1QsRUFBRSxFQUFFLEVBQUUsQ0FBQyxhQUFhLEVBQUUsV0FBVyxDQUFDLEVBQUUsTUFBTSxFQUFFLElBQUksRUFBRTtJQUNsRCxFQUFFLEVBQUUsRUFBRSxDQUFDLGFBQWEsRUFBRSxTQUFTLENBQUMsRUFBRTtJQUNsQyxFQUFFLEVBQUUsRUFBRSxDQUFDLFFBQVEsQ0FBQyxFQUFFO0NBQ25CLENBQUMsQ0FBQSJ9