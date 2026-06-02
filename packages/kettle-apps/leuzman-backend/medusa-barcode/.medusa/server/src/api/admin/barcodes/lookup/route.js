"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.POST = POST;
const zod_1 = require("zod");
const index_js_1 = require("../../../../modules/barcode/index.js");
const barcode_parser_js_1 = require("../../../../modules/barcode/utils/barcode-parser.js");
// ─── Validation ───────────────────────────────────────────────────────────────
const LookupBarcodeSchema = zod_1.z.object({
    barcode: zod_1.z.string().min(1).max(100).trim(),
    skipCache: zod_1.z.boolean().optional().default(false),
});
// ─── POST /admin/barcodes/lookup ──────────────────────────────────────────────
/**
 * Lookup a barcode via local cache → provider fallback chain.
 *
 * Body:
 *   { "barcode": "3017620422003", "skipCache"?: false }
 *
 * Response:
 *   {
 *     "found": true,
 *     "fromCache": false,
 *     "provider": "open-food-facts",
 *     "barcodeType": "ean13",
 *     "product": { title, description, brand, … }
 *   }
 */
async function POST(req, res) {
    const parse = LookupBarcodeSchema.safeParse(req.body);
    if (!parse.success) {
        return res.status(400).json({
            error: "Validation failed",
            details: parse.error.flatten().fieldErrors,
        });
    }
    const { barcode, skipCache } = parse.data;
    // Validate barcode format before hitting the service
    const parsed = (0, barcode_parser_js_1.parseBarcode)(barcode);
    if (!parsed.isValid) {
        return res.status(422).json({
            error: "Invalid barcode format",
            message: parsed.error,
            barcodeType: parsed.type,
            raw: barcode,
        });
    }
    const svc = req.scope.resolve(index_js_1.BARCODE_MODULE);
    const result = await svc.lookupBarcode(barcode, { skipCache });
    return res.status(200).json({
        found: result.found,
        fromCache: result.fromCache,
        provider: result.provider,
        barcodeType: parsed.type,
        normalized: parsed.normalized,
        product: result.product ?? null,
        error: result.error ?? null,
    });
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicm91dGUuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi9zcmMvYXBpL2FkbWluL2JhcmNvZGVzL2xvb2t1cC9yb3V0ZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOztBQThCQSxvQkFtQ0M7QUFoRUQsNkJBQW1EO0FBQ25ELG1FQUFvRjtBQUNwRiwyRkFBbUc7QUFHbkcsaUZBQWlGO0FBRWpGLE1BQU0sbUJBQW1CLEdBQUcsT0FBQyxDQUFDLE1BQU0sQ0FBQztJQUNuQyxPQUFPLEVBQUssT0FBQyxDQUFDLE1BQU0sRUFBRSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsSUFBSSxFQUFFO0lBQzdDLFNBQVMsRUFBRyxPQUFDLENBQUMsT0FBTyxFQUFFLENBQUMsUUFBUSxFQUFFLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQztDQUNsRCxDQUFDLENBQUE7QUFFRixpRkFBaUY7QUFFakY7Ozs7Ozs7Ozs7Ozs7O0dBY0c7QUFDSSxLQUFLLFVBQVUsSUFBSSxDQUFDLEdBQWtCLEVBQUUsR0FBbUI7SUFDaEUsTUFBTSxLQUFLLEdBQUcsbUJBQW1CLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQTtJQUNyRCxJQUFJLENBQUMsS0FBSyxDQUFDLE9BQU8sRUFBRSxDQUFDO1FBQ25CLE9BQU8sR0FBRyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUM7WUFDMUIsS0FBSyxFQUFJLG1CQUFtQjtZQUM1QixPQUFPLEVBQUUsS0FBSyxDQUFDLEtBQUssQ0FBQyxPQUFPLEVBQUUsQ0FBQyxXQUFXO1NBQzNDLENBQUMsQ0FBQTtJQUNKLENBQUM7SUFFRCxNQUFNLEVBQUUsT0FBTyxFQUFFLFNBQVMsRUFBRSxHQUFHLEtBQUssQ0FBQyxJQUFJLENBQUE7SUFFekMscURBQXFEO0lBQ3JELE1BQU0sTUFBTSxHQUFHLElBQUEsZ0NBQVksRUFBQyxPQUFPLENBQUMsQ0FBQTtJQUNwQyxJQUFJLENBQUMsTUFBTSxDQUFDLE9BQU8sRUFBRSxDQUFDO1FBQ3BCLE9BQU8sR0FBRyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUM7WUFDMUIsS0FBSyxFQUFTLHdCQUF3QjtZQUN0QyxPQUFPLEVBQU8sTUFBTSxDQUFDLEtBQUs7WUFDMUIsV0FBVyxFQUFHLE1BQU0sQ0FBQyxJQUFJO1lBQ3pCLEdBQUcsRUFBVyxPQUFPO1NBQ3RCLENBQUMsQ0FBQTtJQUNKLENBQUM7SUFFRCxNQUFNLEdBQUcsR0FBRyxHQUFHLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBaUIseUJBQWMsQ0FBQyxDQUFBO0lBRTdELE1BQU0sTUFBTSxHQUFHLE1BQU0sR0FBRyxDQUFDLGFBQWEsQ0FBQyxPQUFPLEVBQUUsRUFBRSxTQUFTLEVBQUUsQ0FBQyxDQUFBO0lBRTlELE9BQU8sR0FBRyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUM7UUFDMUIsS0FBSyxFQUFRLE1BQU0sQ0FBQyxLQUFLO1FBQ3pCLFNBQVMsRUFBSSxNQUFNLENBQUMsU0FBUztRQUM3QixRQUFRLEVBQUssTUFBTSxDQUFDLFFBQVE7UUFDNUIsV0FBVyxFQUFFLE1BQU0sQ0FBQyxJQUFJO1FBQ3hCLFVBQVUsRUFBRyxNQUFNLENBQUMsVUFBVTtRQUM5QixPQUFPLEVBQU0sTUFBTSxDQUFDLE9BQU8sSUFBSSxJQUFJO1FBQ25DLEtBQUssRUFBUSxNQUFNLENBQUMsS0FBSyxJQUFJLElBQUk7S0FDbEMsQ0FBQyxDQUFBO0FBQ0osQ0FBQyJ9