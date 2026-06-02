"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.POST = POST;
const zod_1 = require("zod");
const utils_1 = require("@medusajs/framework/utils");
const index_js_1 = require("../../../../modules/barcode/index.js");
const barcode_parser_js_1 = require("../../../../modules/barcode/utils/barcode-parser.js");
const lookup_and_create_product_js_1 = require("../../../../workflows/lookup-and-create-product.js");
// ─── Validation ───────────────────────────────────────────────────────────────
const VariantPriceSchema = zod_1.z.object({
    currency_code: zod_1.z.string().min(3).max(3).toLowerCase(),
    amount: zod_1.z.number().int().nonnegative(),
});
const CreateFromBarcodeSchema = zod_1.z.object({
    barcode: zod_1.z.string().min(1).max(100).trim(),
    prices: zod_1.z.array(VariantPriceSchema).optional(),
    salesChannelIds: zod_1.z.array(zod_1.z.string()).optional(),
    categoryIds: zod_1.z.array(zod_1.z.string()).optional(),
    collectionId: zod_1.z.string().optional(),
    publishImmediately: zod_1.z.boolean().optional().default(false),
    skipCache: zod_1.z.boolean().optional().default(false),
});
// ─── POST /admin/barcodes/create-from-barcode ─────────────────────────────────
/**
 * Lookup a barcode and create (or return existing) a Medusa product.
 *
 * Body:
 *   {
 *     "barcode": "3017620422003",
 *     "salesChannelIds"?: ["sc_xxx"],
 *     "categoryIds"?: ["pcat_xxx"],
 *     "collectionId"?: "pcol_xxx",
 *     "publishImmediately"?: false
 *   }
 *
 * Response (201 created):
 *   { "created": true,  "product_id": "prod_xxx", "variant_id": "variant_xxx", "provider": "open-food-facts" }
 *
 * Response (200 existing):
 *   { "created": false, "existing": true, "product_id": "prod_xxx", "variant_id": "variant_xxx" }
 */
async function POST(req, res) {
    const parse = CreateFromBarcodeSchema.safeParse(req.body);
    if (!parse.success) {
        return res.status(400).json({
            error: "Validation failed",
            details: parse.error.flatten().fieldErrors,
        });
    }
    const { barcode, prices, salesChannelIds, categoryIds, collectionId, publishImmediately, skipCache } = parse.data;
    // Validate barcode format
    const parsed = (0, barcode_parser_js_1.parseBarcode)(barcode);
    if (!parsed.isValid) {
        return res.status(422).json({
            error: "Invalid barcode format",
            message: parsed.error,
            barcodeType: parsed.type,
        });
    }
    // Short-circuit if this barcode is already linked to an existing Medusa product
    const svc = req.scope.resolve(index_js_1.BARCODE_MODULE);
    const existingMapping = await svc.findBarcodeProduct(parsed.normalized);
    if (existingMapping) {
        // Verify the referenced Medusa product still exists
        const productModule = req.scope.resolve(utils_1.Modules.PRODUCT);
        const [liveProduct] = await productModule.listProducts({ id: [existingMapping.product_id] })
            .catch(() => [null]);
        if (liveProduct) {
            return res.status(200).json({
                created: false,
                existing: true,
                product_id: existingMapping.product_id,
                variant_id: existingMapping.variant_id ?? null,
                provider: existingMapping.source_provider ?? null,
            });
        }
        // Product was deleted — remove the stale mapping + cache and fall through to creation
        await svc.removeBarcodeProduct(parsed.normalized).catch(() => { });
        await svc.invalidateCache(parsed.normalized).catch(() => { });
    }
    // Run the full orchestration workflow
    const { result } = await (0, lookup_and_create_product_js_1.lookupAndCreateProductWorkflow)(req.scope).run({
        input: {
            barcode: parsed.normalized,
            prices,
            salesChannelIds,
            categoryIds,
            collectionId,
            publishImmediately,
            skipCache,
        },
    });
    return res.status(201).json({
        created: result.created,
        existing: result.existing,
        product_id: result.product_id,
        variant_id: result.variant_id ?? null,
        provider: result.provider,
        title: result.title,
    });
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicm91dGUuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi9zcmMvYXBpL2FkbWluL2JhcmNvZGVzL2NyZWF0ZS1mcm9tLWJhcmNvZGUvcm91dGUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7QUE2Q0Esb0JBb0VDO0FBaEhELDZCQUFtRDtBQUNuRCxxREFBeUU7QUFDekUsbUVBQW9GO0FBQ3BGLDJGQUFtRztBQUNuRyxxR0FBbUc7QUFHbkcsaUZBQWlGO0FBRWpGLE1BQU0sa0JBQWtCLEdBQUcsT0FBQyxDQUFDLE1BQU0sQ0FBQztJQUNsQyxhQUFhLEVBQUUsT0FBQyxDQUFDLE1BQU0sRUFBRSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsV0FBVyxFQUFFO0lBQ3JELE1BQU0sRUFBUyxPQUFDLENBQUMsTUFBTSxFQUFFLENBQUMsR0FBRyxFQUFFLENBQUMsV0FBVyxFQUFFO0NBQzlDLENBQUMsQ0FBQTtBQUVGLE1BQU0sdUJBQXVCLEdBQUcsT0FBQyxDQUFDLE1BQU0sQ0FBQztJQUN2QyxPQUFPLEVBQWMsT0FBQyxDQUFDLE1BQU0sRUFBRSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsSUFBSSxFQUFFO0lBQ3RELE1BQU0sRUFBZSxPQUFDLENBQUMsS0FBSyxDQUFDLGtCQUFrQixDQUFDLENBQUMsUUFBUSxFQUFFO0lBQzNELGVBQWUsRUFBTSxPQUFDLENBQUMsS0FBSyxDQUFDLE9BQUMsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDLFFBQVEsRUFBRTtJQUNuRCxXQUFXLEVBQVUsT0FBQyxDQUFDLEtBQUssQ0FBQyxPQUFDLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQyxRQUFRLEVBQUU7SUFDbkQsWUFBWSxFQUFTLE9BQUMsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxRQUFRLEVBQUU7SUFDMUMsa0JBQWtCLEVB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