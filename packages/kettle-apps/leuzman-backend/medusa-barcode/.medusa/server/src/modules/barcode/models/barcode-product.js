"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BarcodeProduct = void 0;
const utils_1 = require("@medusajs/framework/utils");
/**
 * Permanent relationship between a scanned barcode and the Medusa product
 * (and optional variant) that was created from it.
 */
exports.BarcodeProduct = utils_1.model.define("barcode_product", {
    id: utils_1.model.id().primaryKey(),
    /** The raw normalised barcode string (EAN-13, UPC-A, Code128 …) */
    barcode: utils_1.model.text().unique(),
    /** Medusa product.id */
    product_id: utils_1.model.text(),
    /** Optional Medusa variant.id */
    variant_id: utils_1.model.text().nullable(),
    /** Provider that supplied the product data */
    source_provider: utils_1.model.text().nullable(),
    /** 0-1 confidence score (1 = exact match from provider) */
    confidence_score: utils_1.model.number().nullable(),
});
exports.default = exports.BarcodeProduct;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYmFyY29kZS1wcm9kdWN0LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vc3JjL21vZHVsZXMvYmFyY29kZS9tb2RlbHMvYmFyY29kZS1wcm9kdWN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUFBLHFEQUFpRDtBQUVqRDs7O0dBR0c7QUFDVSxRQUFBLGNBQWMsR0FBRyxhQUFLLENBQUMsTUFBTSxDQUFDLGlCQUFpQixFQUFFO0lBQzVELEVBQUUsRUFBZ0IsYUFBSyxDQUFDLEVBQUUsRUFBRSxDQUFDLFVBQVUsRUFBRTtJQUN6QyxtRUFBbUU7SUFDbkUsT0FBTyxFQUFXLGFBQUssQ0FBQyxJQUFJLEVBQUUsQ0FBQyxNQUFNLEVBQUU7SUFDdkMsd0JBQXdCO0lBQ3hCLFVBQVUsRUFBUSxhQUFLLENBQUMsSUFBSSxFQUFFO0lBQzlCLGlDQUFpQztJQUNqQyxVQUFVLEVBQVEsYUFBSyxDQUFDLElBQUksRUFBRSxDQUFDLFFBQVEsRUFBRTtJQUN6Qyw4Q0FBOEM7SUFDOUMsZUFBZSxFQUFHLGFBQUssQ0FBQyxJQUFJLEVBQUUsQ0FBQyxRQUFRLEVBQUU7SUFDekMsMkRBQTJEO0lBQzNELGdCQUFnQixFQUFFLGFBQUssQ0FBQyxNQUFNLEVBQUUsQ0FBQyxRQUFRLEVBQUU7Q0FDNUMsQ0FBQyxDQUFBO0FBRUYsa0JBQWUsc0JBQWMsQ0FBQSJ9