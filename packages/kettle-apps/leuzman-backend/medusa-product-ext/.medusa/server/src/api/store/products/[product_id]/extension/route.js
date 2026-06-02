"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GET = GET;
const index_1 = require("../../../../../modules/product-ext/index");
async function GET(req, res) {
    const { product_id } = req.params;
    const service = req.scope.resolve(index_1.PRODUCT_EXT_MODULE);
    const variantIdsParam = req.query.variant_ids;
    const variantIds = variantIdsParam
        ? variantIdsParam.split(',').map((s) => s.trim()).filter(Boolean)
        : [];
    // Parallel fetch — product ext + variant exts
    const [productExts, variantExts] = await Promise.all([
        service.listProductExtensions({ product_id }),
        variantIds.length
            ? service.listVariantExtensions({ variant_id: variantIds })
            : Promise.resolve([]),
    ]);
    const productExt = productExts[0] ?? null;
    const variants = {};
    for (const ext of variantExts) {
        variants[ext.variant_id] = { videos: ext.videos ?? [] };
    }
    res.json({
        product_id,
        videos: productExt?.videos ?? [],
        tagline: productExt?.tagline ?? null,
        variants,
    });
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicm91dGUuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9zcmMvYXBpL3N0b3JlL3Byb2R1Y3RzL1twcm9kdWN0X2lkXS9leHRlbnNpb24vcm91dGUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7QUFjQSxrQkE4QkM7QUFqQ0Qsb0VBQThFO0FBR3ZFLEtBQUssVUFBVSxHQUFHLENBQUMsR0FBa0IsRUFBRSxHQUFtQjtJQUMvRCxNQUFNLEVBQUUsVUFBVSxFQUFFLEdBQUcsR0FBRyxDQUFDLE1BQWdDLENBQUM7SUFDNUQsTUFBTSxPQUFPLEdBQUcsR0FBRyxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQW9CLDBCQUFrQixDQUFDLENBQUM7SUFFekUsTUFBTSxlQUFlLEdBQUksR0FBRyxDQUFDLEtBQWEsQ0FBQyxXQUFpQyxDQUFDO0lBQzdFLE1BQU0sVUFBVSxHQUFhLGVBQWU7UUFDMUMsQ0FBQyxDQUFDLGVBQWUsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsSUFBSSxFQUFFLENBQUMsQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDO1FBQ2pFLENBQUMsQ0FBQyxFQUFFLENBQUM7SUFFUCw4Q0FBOEM7SUFDOUMsTUFBTSxDQUFDLFdBQVcsRUFBRSxXQUFXLENBQUMsR0FBRyxNQUFNLE9BQU8sQ0FBQyxHQUFHLENBQUM7UUFDbkQsT0FBTyxDQUFDLHFCQUFxQixDQUFDLEVBQUUsVUFBVSxFQUFFLENBQUM7UUFDN0MsVUFBVSxDQUFDLE1BQU07WUFDZixDQUFDLENBQUMsT0FBTyxDQUFDLHFCQUFxQixDQUFDLEVBQUUsVUFBVSxFQUFFLFVBQVUsRUFBUyxDQUFDO1lBQ2xFLENBQUMsQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQztLQUN4QixDQUFDLENBQUM7SUFFSCxNQUFNLFVBQVUsR0FBRyxXQUFXLENBQUMsQ0FBQyxDQUFDLElBQUksSUFBSSxDQUFDO0lBRTFDLE1BQU0sUUFBUSxHQUFzQyxFQUFFLENBQUM7SUFDdkQsS0FBSyxNQUFNLEdBQUcsSUFBSSxXQUFXLEVBQUUsQ0FBQztRQUM5QixRQUFRLENBQUMsR0FBRyxDQUFDLFVBQVUsQ0FBQyxHQUFHLEVBQUUsTUFBTSxFQUFHLEdBQUcsQ0FBQyxNQUEyQixJQUFJLEVBQUUsRUFBRSxDQUFDO0lBQ2hGLENBQUM7SUFFRCxHQUFHLENBQUMsSUFBSSxDQUFDO1FBQ1AsVUFBVTtRQUNWLE1BQU0sRUFBSyxVQUFVLEVBQUUsTUFBMkIsSUFBSSxFQUFFO1FBQ3hELE9BQU8sRUFBRyxVQUFVLEVBQUUsT0FBTyxJQUFJLElBQUk7UUFDckMsUUFBUTtLQUNULENBQUMsQ0FBQztBQUNMLENBQUMifQ==