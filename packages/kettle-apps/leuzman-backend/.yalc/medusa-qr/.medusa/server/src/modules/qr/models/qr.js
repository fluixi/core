"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.QR = void 0;
const utils_1 = require("@medusajs/framework/utils");
exports.QR = utils_1.model.define("qr", {
    id: utils_1.model.id().primaryKey(),
    code: utils_1.model.text().unique(),
    resource_type: utils_1.model.text(), // product, variant
    resource_id: utils_1.model.text(),
    type: utils_1.model.enum(["static", "dynamic"]).default("dynamic"),
    action: utils_1.model.enum(["view", "add_to_cart", "verify"]).default("view"),
    payload: utils_1.model.json(),
    image_url: utils_1.model.text(),
    scan_count: utils_1.model.number().default(0),
    last_scanned_at: utils_1.model.dateTime().nullable(),
    expires_at: utils_1.model.dateTime().nullable(),
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi9zcmMvbW9kdWxlcy9xci9tb2RlbHMvcXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQUEscURBQWlEO0FBRXBDLFFBQUEsRUFBRSxHQUFHLGFBQUssQ0FBQyxNQUFNLENBQUMsSUFBSSxFQUFFO0lBQ25DLEVBQUUsRUFBRSxhQUFLLENBQUMsRUFBRSxFQUFFLENBQUMsVUFBVSxFQUFFO0lBRTNCLElBQUksRUFBRSxhQUFLLENBQUMsSUFBSSxFQUFFLENBQUMsTUFBTSxFQUFFO0lBRTNCLGFBQWEsRUFBRSxhQUFLLENBQUMsSUFBSSxFQUFFLEVBQUksbUJBQW1CO0lBQ2xELFdBQVcsRUFBRSxhQUFLLENBQUMsSUFBSSxFQUFFO0lBRXpCLElBQUksRUFBRSxhQUFLLENBQUMsSUFBSSxDQUFDLENBQUMsUUFBUSxFQUFFLFNBQVMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLFNBQVMsQ0FBQztJQUMxRCxNQUFNLEVBQUUsYUFBSyxDQUFDLElBQUksQ0FBQyxDQUFDLE1BQU0sRUFBRSxhQUFhLEVBQUUsUUFBUSxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDO0lBRXJFLE9BQU8sRUFBRSxhQUFLLENBQUMsSUFBSSxFQUFFO0lBQ3JCLFNBQVMsRUFBRSxhQUFLLENBQUMsSUFBSSxFQUFFO0lBRXZCLFVBQVUsRUFBRSxhQUFLLENBQUMsTUFBTSxFQUFFLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQztJQUNyQyxlQUFlLEVBQUUsYUFBSyxDQUFDLFFBQVEsRUFBRSxDQUFDLFFBQVEsRUFBRTtJQUU1QyxVQUFVLEVBQUUsYUFBSyxDQUFDLFFBQVEsRUFBRSxDQUFDLFFBQVEsRUFBRTtDQUN4QyxDQUFDLENBQUEifQ==