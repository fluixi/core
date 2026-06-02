"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BarcodeCache = void 0;
const utils_1 = require("@medusajs/framework/utils");
/**
 * Local cache of raw provider responses + their normalised form.
 * Indexed by (barcode, provider) with an optional TTL column.
 */
exports.BarcodeCache = utils_1.model.define("barcode_cache", {
    id: utils_1.model.id().primaryKey(),
    barcode: utils_1.model.text(),
    provider: utils_1.model.text(),
    raw_response: utils_1.model.json(),
    normalized_data: utils_1.model.json().nullable(),
    expires_at: utils_1.model.dateTime().nullable(),
});
exports.default = exports.BarcodeCache;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYmFyY29kZS1jYWNoZS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uL3NyYy9tb2R1bGVzL2JhcmNvZGUvbW9kZWxzL2JhcmNvZGUtY2FjaGUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQUEscURBQWlEO0FBRWpEOzs7R0FHRztBQUNVLFFBQUEsWUFBWSxHQUFHLGFBQUssQ0FBQyxNQUFNLENBQUMsZUFBZSxFQUFFO0lBQ3hELEVBQUUsRUFBZSxhQUFLLENBQUMsRUFBRSxFQUFFLENBQUMsVUFBVSxFQUFFO0lBQ3hDLE9BQU8sRUFBVSxhQUFLLENBQUMsSUFBSSxFQUFFO0lBQzdCLFFBQVEsRUFBUyxhQUFLLENBQUMsSUFBSSxFQUFFO0lBQzdCLFlBQVksRUFBSyxhQUFLLENBQUMsSUFBSSxFQUFFO0lBQzdCLGVBQWUsRUFBRSxhQUFLLENBQUMsSUFBSSxFQUFFLENBQUMsUUFBUSxFQUFFO0lBQ3hDLFVBQVUsRUFBTyxhQUFLLENBQUMsUUFBUSxFQUFFLENBQUMsUUFBUSxFQUFFO0NBQzdDLENBQUMsQ0FBQTtBQUVGLGtCQUFlLG9CQUFZLENBQUEifQ==