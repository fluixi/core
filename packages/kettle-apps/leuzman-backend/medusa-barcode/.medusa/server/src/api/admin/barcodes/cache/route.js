"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GET = GET;
exports.DELETE = DELETE;
const index_js_1 = require("../../../../modules/barcode/index.js");
// ─── GET /admin/barcodes/cache ────────────────────────────────────────────────
/**
 * Return cache statistics.
 * Response: { "total": N, "expired": M }
 */
async function GET(req, res) {
    const svc = req.scope.resolve(index_js_1.BARCODE_MODULE);
    const stats = await svc.cacheStats();
    return res.status(200).json(stats);
}
// ─── DELETE /admin/barcodes/cache ─────────────────────────────────────────────
/**
 * Purge all expired cache entries.
 * Response: { "purged": N }
 */
async function DELETE(req, res) {
    const svc = req.scope.resolve(index_js_1.BARCODE_MODULE);
    const purged = await svc.purgeExpiredCache();
    return res.status(200).json({ purged });
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicm91dGUuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi9zcmMvYXBpL2FkbWluL2JhcmNvZGVzL2NhY2hlL3JvdXRlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7O0FBV0Esa0JBSUM7QUFRRCx3QkFJQztBQXpCRCxtRUFBb0Y7QUFHcEYsaUZBQWlGO0FBRWpGOzs7R0FHRztBQUNJLEtBQUssVUFBVSxHQUFHLENBQUMsR0FBa0IsRUFBRSxHQUFtQjtJQUMvRCxNQUFNLEdBQUcsR0FBSyxHQUFHLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBaUIseUJBQWMsQ0FBQyxDQUFBO0lBQy9ELE1BQU0sS0FBSyxHQUFHLE1BQU0sR0FBRyxDQUFDLFVBQVUsRUFBRSxDQUFBO0lBQ3BDLE9BQU8sR0FBRyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUE7QUFDcEMsQ0FBQztBQUVELGlGQUFpRjtBQUVqRjs7O0dBR0c7QUFDSSxLQUFLLFVBQVUsTUFBTSxDQUFDLEdBQWtCLEVBQUUsR0FBbUI7SUFDbEUsTUFBTSxHQUFHLEdBQU0sR0FBRyxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQWlCLHlCQUFjLENBQUMsQ0FBQTtJQUNoRSxNQUFNLE1BQU0sR0FBRyxNQUFNLEdBQUcsQ0FBQyxpQkFBaUIsRUFBRSxDQUFBO0lBQzVDLE9BQU8sR0FBRyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUMsRUFBRSxNQUFNLEVBQUUsQ0FBQyxDQUFBO0FBQ3pDLENBQUMifQ==