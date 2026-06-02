"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GET = GET;
exports.POST = POST;
const index_1 = require("../../../../../../../modules/product-ext/index");
const upsert_variant_ext_1 = require("../../../../../../../workflows/upsert-variant-ext");
async function GET(req, res) {
    const { variant_id } = req.params;
    const service = req.scope.resolve(index_1.PRODUCT_EXT_MODULE);
    const results = await service.listVariantExtensions({ variant_id });
    res.json({ extension: results[0] ?? null });
}
async function POST(req, res) {
    const { variant_id } = req.params;
    const body = req.body;
    const { result: extension } = await (0, upsert_variant_ext_1.upsertVariantExtWorkflow)(req.scope).run({
        input: { variant_id, ...body },
    });
    res.json({ extension });
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicm91dGUuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9zcmMvYXBpL2FkbWluL3Byb2R1Y3RzL1twcm9kdWN0X2lkXS92YXJpYW50cy9bdmFyaWFudF9pZF0vZXh0ZW5zaW9uL3JvdXRlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7O0FBV0Esa0JBTUM7QUFFRCxvQkFTQztBQXJCRCwwRUFBb0Y7QUFFcEYsMEZBQTZGO0FBRXRGLEtBQUssVUFBVSxHQUFHLENBQUMsR0FBa0IsRUFBRSxHQUFtQjtJQUMvRCxNQUFNLEVBQUUsVUFBVSxFQUFFLEdBQUcsR0FBRyxDQUFDLE1BQWdDLENBQUM7SUFDNUQsTUFBTSxPQUFPLEdBQUcsR0FBRyxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQW9CLDBCQUFrQixDQUFDLENBQUM7SUFFekUsTUFBTSxPQUFPLEdBQUcsTUFBTSxPQUFPLENBQUMscUJBQXFCLENBQUMsRUFBRSxVQUFVLEVBQUUsQ0FBQyxDQUFDO0lBQ3BFLEdBQUcsQ0FBQyxJQUFJLENBQUMsRUFBRSxTQUFTLEVBQUUsT0FBTyxDQUFDLENBQUMsQ0FBQyxJQUFJLElBQUksRUFBRSxDQUFDLENBQUM7QUFDOUMsQ0FBQztBQUVNLEtBQUssVUFBVSxJQUFJLENBQUMsR0FBa0IsRUFBRSxHQUFtQjtJQUNoRSxNQUFNLEVBQUUsVUFBVSxFQUFFLEdBQUcsR0FBRyxDQUFDLE1BQWdDLENBQUM7SUFDNUQsTUFBTSxJQUFJLEdBQUcsR0FBRyxDQUFDLElBQTBCLENBQUM7SUFFNUMsTUFBTSxFQUFFLE1BQU0sRUFBRSxTQUFTLEVBQUUsR0FBRyxNQUFNLElBQUEsNkNBQXdCLEVBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxDQUFDLEdBQUcsQ0FBQztRQUMxRSxLQUFLLEVBQUUsRUFBRSxVQUFVLEVBQUUsR0FBRyxJQUFJLEVBQUU7S0FDL0IsQ0FBQyxDQUFDO0lBRUgsR0FBRyxDQUFDLElBQUksQ0FBQyxFQUFFLFNBQVMsRUFBRSxDQUFDLENBQUM7QUFDMUIsQ0FBQyJ9