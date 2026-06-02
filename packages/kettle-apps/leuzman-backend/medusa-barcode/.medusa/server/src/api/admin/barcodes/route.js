"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GET = GET;
const index_js_1 = require("../../../modules/barcode/index.js");
// ─── GET /admin/barcodes ──────────────────────────────────────────────────────
/**
 * List all BarcodeProduct records.
 * Query: limit, offset, product_id, provider
 *
 * Response:
 *   { "barcodes": [...], "count": N }
 */
async function GET(req, res) {
    const { limit = 20, offset = 0, product_id, provider } = req.query;
    const svc = req.scope.resolve(index_js_1.BARCODE_MODULE);
    const filters = {};
    if (product_id)
        filters.product_id = product_id;
    const barcodes = await svc.listBarcodeProducts(filters, {
        take: Number(limit),
        skip: Number(offset),
        order: { created_at: "DESC" },
    });
    return res.status(200).json({ barcodes, count: barcodes.length });
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicm91dGUuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi9zcmMvYXBpL2FkbWluL2JhcmNvZGVzL3JvdXRlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7O0FBY0Esa0JBZUM7QUEzQkQsZ0VBQWlGO0FBR2pGLGlGQUFpRjtBQUVqRjs7Ozs7O0dBTUc7QUFDSSxLQUFLLFVBQVUsR0FBRyxDQUFDLEdBQWtCLEVBQUUsR0FBbUI7SUFDL0QsTUFBTSxFQUFFLEtBQUssR0FBRyxFQUFFLEVBQUUsTUFBTSxHQUFHLENBQUMsRUFBRSxVQUFVLEVBQUUsUUFBUSxFQUFFLEdBQUcsR0FBRyxDQUFDLEtBQStCLENBQUE7SUFFNUYsTUFBTSxHQUFHLEdBQUcsR0FBRyxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQWlCLHlCQUFjLENBQUMsQ0FBQTtJQUU3RCxNQUFNLE9BQU8sR0FBNEIsRUFBRSxDQUFBO0lBQzNDLElBQUksVUFBVTtRQUFFLE9BQU8sQ0FBQyxVQUFVLEdBQUcsVUFBVSxDQUFBO0lBRS9DLE1BQU0sUUFBUSxHQUFHLE1BQU0sR0FBRyxDQUFDLG1CQUFtQixDQUFDLE9BQU8sRUFBRTtRQUN0RCxJQUFJLEVBQUcsTUFBTSxDQUFDLEtBQUssQ0FBQztRQUNwQixJQUFJLEVBQUcsTUFBTSxDQUFDLE1BQU0sQ0FBQztRQUNyQixLQUFLLEVBQUUsRUFBRSxVQUFVLEVBQUUsTUFBTSxFQUFFO0tBQzlCLENBQUMsQ0FBQTtJQUVGLE9BQU8sR0FBRyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUMsRUFBRSxRQUFRLEVBQUUsS0FBSyxFQUFFLFFBQVEsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFBO0FBQ25FLENBQUMifQ==