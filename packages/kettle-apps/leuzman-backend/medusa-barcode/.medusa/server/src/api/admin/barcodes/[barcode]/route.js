"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GET = GET;
exports.DELETE = DELETE;
const index_js_1 = require("../../../../modules/barcode/index.js");
const barcode_parser_js_1 = require("../../../../modules/barcode/utils/barcode-parser.js");
// ─── GET /admin/barcodes/:barcode ─────────────────────────────────────────────
/**
 * Retrieve the BarcodeProduct + cached lookup data for a specific barcode.
 *
 * Response:
 *   {
 *     "barcodeProduct": { id, barcode, product_id, … } | null,
 *     "cache":          { barcode, provider, normalized_data, expires_at } | null,
 *     "parsed":         { raw, normalized, type, isValid }
 *   }
 */
async function GET(req, res) {
    const raw = req.params.barcode;
    const svc = req.scope.resolve(index_js_1.BARCODE_MODULE);
    const parsed = (0, barcode_parser_js_1.parseBarcode)(raw);
    const barcodeProduct = await svc.findBarcodeProduct(raw);
    // Also surface the latest cache entry (for freshness info)
    const cacheEntries = await svc.listBarcodeCaches({ barcode: parsed.normalized }, { order: { created_at: "DESC" }, take: 1 });
    return res.status(200).json({
        parsed: parsed,
        barcodeProduct: barcodeProduct ?? null,
        cache: cacheEntries[0] ?? null,
    });
}
// ─── DELETE /admin/barcodes/:barcode ─────────────────────────────────────────
/**
 * Remove the BarcodeProduct relation and invalidate the cache for a barcode.
 * Does NOT delete the Medusa product itself.
 *
 * Response: { "success": true }
 */
async function DELETE(req, res) {
    const raw = req.params.barcode;
    const svc = req.scope.resolve(index_js_1.BARCODE_MODULE);
    await svc.removeBarcodeProduct(raw);
    await svc.invalidateCache(raw);
    return res.status(200).json({ success: true });
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicm91dGUuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi9zcmMvYXBpL2FkbWluL2JhcmNvZGVzL1tiYXJjb2RlXS9yb3V0ZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOztBQWlCQSxrQkFrQkM7QUFVRCx3QkFRQztBQXBERCxtRUFBb0Y7QUFDcEYsMkZBQW1HO0FBR25HLGlGQUFpRjtBQUVqRjs7Ozs7Ozs7O0dBU0c7QUFDSSxLQUFLLFVBQVUsR0FBRyxDQUFDLEdBQWtCLEVBQUUsR0FBbUI7SUFDL0QsTUFBTSxHQUFHLEdBQUksR0FBRyxDQUFDLE1BQThCLENBQUMsT0FBTyxDQUFBO0lBQ3ZELE1BQU0sR0FBRyxHQUFHLEdBQUcsQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFpQix5QkFBYyxDQUFDLENBQUE7SUFFN0QsTUFBTSxNQUFNLEdBQVksSUFBQSxnQ0FBWSxFQUFDLEdBQUcsQ0FBQyxDQUFBO0lBQ3pDLE1BQU0sY0FBYyxHQUFJLE1BQU0sR0FBRyxDQUFDLGtCQUFrQixDQUFDLEdBQUcsQ0FBQyxDQUFBO0lBRXpELDJEQUEyRDtJQUMzRCxNQUFNLFlBQVksR0FBRyxNQUFNLEdBQUcsQ0FBQyxpQkFBaUIsQ0FDOUMsRUFBRSxPQUFPLEVBQUUsTUFBTSxDQUFDLFVBQVUsRUFBRSxFQUM5QixFQUFFLEtBQUssRUFBRSxFQUFFLFVBQVUsRUFBRSxNQUFNLEVBQUUsRUFBRSxJQUFJLEVBQUUsQ0FBQyxFQUFFLENBQzNDLENBQUE7SUFFRCxPQUFPLEdBQUcsQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFDO1FBQzFCLE1BQU0sRUFBVSxNQUFNO1FBQ3RCLGNBQWMsRUFBRSxjQUFjLElBQUksSUFBSTtRQUN0QyxLQUFLLEVBQVcsWUFBWSxDQUFDLENBQUMsQ0FBQyxJQUFJLElBQUk7S0FDeEMsQ0FBQyxDQUFBO0FBQ0osQ0FBQztBQUVELGdGQUFnRjtBQUVoRjs7Ozs7R0FLRztBQUNJLEtBQUssVUFBVSxNQUFNLENBQUMsR0FBa0IsRUFBRSxHQUFtQjtJQUNsRSxNQUFNLEdBQUcsR0FBSSxHQUFHLENBQUMsTUFBOEIsQ0FBQyxPQUFPLENBQUE7SUFDdkQsTUFBTSxHQUFHLEdBQUcsR0FBRyxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQWlCLHlCQUFjLENBQUMsQ0FBQTtJQUU3RCxNQUFNLEdBQUcsQ0FBQyxvQkFBb0IsQ0FBQyxHQUFHLENBQUMsQ0FBQTtJQUNuQyxNQUFNLEdBQUcsQ0FBQyxlQUFlLENBQUMsR0FBRyxDQUFDLENBQUE7SUFFOUIsT0FBTyxHQUFHLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDLElBQUksQ0FBQyxFQUFFLE9BQU8sRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFBO0FBQ2hELENBQUMifQ==