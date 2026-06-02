"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.POST = POST;
const zod_1 = require("zod");
const batch_import_js_1 = require("../../../../workflows/batch-import.js");
// ─── Validation ───────────────────────────────────────────────────────────────
const BatchImportSchema = zod_1.z.object({
    barcodes: zod_1.z.array(zod_1.z.string().min(1).max(100).trim()).min(1).max(200),
    salesChannelIds: zod_1.z.array(zod_1.z.string()).optional(),
    categoryIds: zod_1.z.array(zod_1.z.string()).optional(),
    publishImmediately: zod_1.z.boolean().optional().default(false),
    skipExisting: zod_1.z.boolean().optional().default(true),
});
// ─── POST /admin/barcodes/batch ───────────────────────────────────────────────
/**
 * Batch-import up to 200 barcodes, creating a Medusa product for each.
 *
 * Body:
 *   {
 *     "barcodes": ["3017620422003", "012000161155"],
 *     "salesChannelIds"?: [],
 *     "skipExisting"?: true
 *   }
 *
 * Response:
 *   {
 *     "total": 2, "created": 2, "skipped": 0, "failed": 0,
 *     "results": [...]
 *   }
 */
async function POST(req, res) {
    const parse = BatchImportSchema.safeParse(req.body);
    if (!parse.success) {
        return res.status(400).json({
            error: "Validation failed",
            details: parse.error.flatten().fieldErrors,
        });
    }
    const { result } = await (0, batch_import_js_1.batchBarcodeImportWorkflow)(req.scope).run({
        input: parse.data,
    });
    return res.status(207).json(result);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicm91dGUuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi9zcmMvYXBpL2FkbWluL2JhcmNvZGVzL2JhdGNoL3JvdXRlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7O0FBZ0NBLG9CQWNDO0FBN0NELDZCQUFtRDtBQUNuRCwyRUFBcUY7QUFFckYsaUZBQWlGO0FBRWpGLE1BQU0saUJBQWlCLEdBQUcsT0FBQyxDQUFDLE1BQU0sQ0FBQztJQUNqQyxRQUFRLEVBQWEsT0FBQyxDQUFDLEtBQUssQ0FBQyxPQUFDLENBQUMsTUFBTSxFQUFFLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDO0lBQy9FLGVBQWUsRUFBTSxPQUFDLENBQUMsS0FBSyxDQUFDLE9BQUMsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDLFFBQVEsRUFBRTtJQUNuRCxXQUFXLEVBQVUsT0FBQyxDQUFDLEtBQUssQ0FBQyxPQUFDLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQyxRQUFRLEVBQUU7SUFDbkQsa0JBQWtCLEVBQUcsT0FBQyxDQUFDLE9BQU8sRUFBRSxDQUFDLFFBQVEsRUFBRSxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUM7SUFDMUQsWUFBWSxFQUFTLE9BQUMsQ0FBQyxPQUFPLEVBQUUsQ0FBQyxRQUFRLEVBQUUsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDO0NBQzFELENBQUMsQ0FBQTtBQUVGLGlGQUFpRjtBQUVqRjs7Ozs7Ozs7Ozs7Ozs7O0dBZUc7QUFDSSxLQUFLLFVBQVUsSUFBSSxDQUFDLEdBQWtCLEVBQUUsR0FBbUI7SUFDaEUsTUFBTSxLQUFLLEdBQUcsaUJBQWlCLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQTtJQUNuRCxJQUFJLENBQUMsS0FBSyxDQUFDLE9BQU8sRUFBRSxDQUFDO1FBQ25CLE9BQU8sR0FBRyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUM7WUFDMUIsS0FBSyxFQUFJLG1CQUFtQjtZQUM1QixPQUFPLEVBQUUsS0FBSyxDQUFDLEtBQUssQ0FBQyxPQUFPLEVBQUUsQ0FBQyxXQUFXO1NBQzNDLENBQUMsQ0FBQTtJQUNKLENBQUM7SUFFRCxNQUFNLEVBQUUsTUFBTSxFQUFFLEdBQUcsTUFBTSxJQUFBLDRDQUEwQixFQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsQ0FBQyxHQUFHLENBQUM7UUFDakUsS0FBSyxFQUFFLEtBQUssQ0FBQyxJQUFJO0tBQ2xCLENBQUMsQ0FBQTtJQUVGLE9BQU8sR0FBRyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUE7QUFDckMsQ0FBQyJ9