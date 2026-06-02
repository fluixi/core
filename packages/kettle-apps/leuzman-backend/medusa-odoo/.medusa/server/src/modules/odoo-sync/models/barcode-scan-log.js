"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BarcodeScanLog = void 0;
const utils_1 = require("@medusajs/framework/utils");
exports.BarcodeScanLog = utils_1.model.define('barcode_scan_log', {
    id: utils_1.model.id().primaryKey(),
    barcode: utils_1.model.text(),
    context: utils_1.model.text(),
    device_id: utils_1.model.text().nullable(),
    session_id: utils_1.model.text().nullable(),
    operator_id: utils_1.model.text().nullable(),
    variant_id: utils_1.model.text().nullable(),
    odoo_product_id: utils_1.model.number().nullable(),
    resolution_status: utils_1.model.text().default('resolved'),
    resolution_latency_ms: utils_1.model.number().nullable(),
    action_taken: utils_1.model.text().nullable(),
    quantity: utils_1.model.number().nullable(),
    location_id: utils_1.model.text().nullable(),
    scan_timestamp: utils_1.model.dateTime(),
    metadata: utils_1.model.json().nullable(),
}).indexes([
    { on: ['barcode'] },
    { on: ['context'] },
    { on: ['device_id'] },
    { on: ['resolution_status'] },
]);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYmFyY29kZS1zY2FuLWxvZy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uL3NyYy9tb2R1bGVzL29kb28tc3luYy9tb2RlbHMvYmFyY29kZS1zY2FuLWxvZy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFBQSxxREFBaUQ7QUFFcEMsUUFBQSxjQUFjLEdBQUcsYUFBSyxDQUFDLE1BQU0sQ0FBQyxrQkFBa0IsRUFBRTtJQUM3RCxFQUFFLEVBQXFCLGFBQUssQ0FBQyxFQUFFLEVBQUUsQ0FBQyxVQUFVLEVBQUU7SUFDOUMsT0FBTyxFQUFnQixhQUFLLENBQUMsSUFBSSxFQUFFO0lBQ25DLE9BQU8sRUFBZ0IsYUFBSyxDQUFDLElBQUksRUFBRTtJQUNuQyxTQUFTLEVBQWMsYUFBSyxDQUFDLElBQUksRUFBRSxDQUFDLFFBQVEsRUFBRTtJQUM5QyxVQUFVLEVBQWEsYUFBSyxDQUFDLElBQUksRUFBRSxDQUFDLFFBQVEsRUFBRTtJQUM5QyxXQUFXLEVBQVksYUFBSyxDQUFDLElBQUksRUFBRSxDQUFDLFFBQVEsRUFBRTtJQUM5QyxVQUFVLEVBQWEsYUFBSyxDQUFDLElBQUksRUFBRSxDQUFDLFFBQVEsRUFBRTtJQUM5QyxlQUFlLEVBQVEsYUFBSyxDQUFDLE1BQU0sRUFBRSxDQUFDLFFBQVEsRUFBRTtJQUNoRCxpQkFBaUIsRUFBTSxhQUFLLENBQUMsSUFBSSxFQUFFLENBQUMsT0FBTyxDQUFDLFVBQVUsQ0FBQztJQUN2RCxxQkFBcUIsRUFBRSxhQUFLLENBQUMsTUFBTSxFQUFFLENBQUMsUUFBUSxFQUFFO0lBQ2hELFlBQVksRUFBVyxhQUFLLENBQUMsSUFBSSxFQUFFLENBQUMsUUFBUSxFQUFFO0lBQzlDLFFBQVEsRUFBZSxhQUFLLENBQUMsTUFBTSxFQUFFLENBQUMsUUFBUSxFQUFFO0lBQ2hELFdBQVcsRUFBWSxhQUFLLENBQUMsSUFBSSxFQUFFLENBQUMsUUFBUSxFQUFFO0lBQzlDLGNBQWMsRUFBUyxhQUFLLENBQUMsUUFBUSxFQUFFO0lBQ3ZDLFFBQVEsRUFBZSxhQUFLLENBQUMsSUFBSSxFQUFFLENBQUMsUUFBUSxFQUFFO0NBQy9DLENBQUMsQ0FBQyxPQUFPLENBQUM7SUFDVCxFQUFFLEVBQUUsRUFBRSxDQUFDLFNBQVMsQ0FBQyxFQUFFO0lBQ25CLEVBQUUsRUFBRSxFQUFFLENBQUMsU0FBUyxDQUFDLEVBQUU7SUFDbkIsRUFBRSxFQUFFLEVBQUUsQ0FBQyxXQUFXLENBQUMsRUFBRTtJQUNyQixFQUFFLEVBQUUsRUFBRSxDQUFDLG1CQUFtQixDQUFDLEVBQUU7Q0FDOUIsQ0FBQyxDQUFBIn0=