"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GET = GET;
exports.POST = POST;
const index_1 = require("../../../../../modules/product-ext/index");
const upsert_product_ext_1 = require("../../../../../workflows/upsert-product-ext");
async function GET(req, res) {
    const { product_id } = req.params;
    const service = req.scope.resolve(index_1.PRODUCT_EXT_MODULE);
    const results = await service.listProductExtensions({ product_id });
    res.json({ extension: results[0] ?? null });
}
async function POST(req, res) {
    const { product_id } = req.params;
    const body = req.body;
    const { result: extension } = await (0, upsert_product_ext_1.upsertProductExtWorkflow)(req.scope).run({
        input: { product_id, ...body },
    });
    res.json({ extension });
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicm91dGUuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9zcmMvYXBpL2FkbWluL3Byb2R1Y3RzL1twcm9kdWN0X2lkXS9leHRlbnNpb24vcm91dGUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7QUFjQSxrQkFNQztBQUVELG9CQVNDO0FBckJELG9FQUE4RTtBQUU5RSxvRkFBdUY7QUFFaEYsS0FBSyxVQUFVLEdBQUcsQ0FBQyxHQUFrQixFQUFFLEdBQW1CO0lBQy9ELE1BQU0sRUFBRSxVQUFVLEVBQUUsR0FBRyxHQUFHLENBQUMsTUFBZ0MsQ0FBQztJQUM1RCxNQUFNLE9BQU8sR0FBRyxHQUFHLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBb0IsMEJBQWtCLENBQUMsQ0FBQztJQUV6RSxNQUFNLE9BQU8sR0FBRyxNQUFNLE9BQU8sQ0FBQyxxQkFBcUIsQ0FBQyxFQUFFLFVBQVUsRUFBRSxDQUFDLENBQUM7SUFDcEUsR0FBRyxDQUFDLElBQUksQ0FBQyxFQUFFLFNBQVMsRUFBRSxPQUFPLENBQUMsQ0FBQyxDQUFDLElBQUksSUFBSSxFQUFFLENBQUMsQ0FBQztBQUM5QyxDQUFDO0FBRU0sS0FBSyxVQUFVLElBQUksQ0FBQyxHQUFrQixFQUFFLEdBQW1CO0lBQ2hFLE1BQU0sRUFBRSxVQUFVLEVBQUUsR0FBRyxHQUFHLENBQUMsTUFBZ0MsQ0FBQztJQUM1RCxNQUFNLElBQUksR0FBRyxHQUFHLENBQUMsSUFBbUQsQ0FBQztJQUVyRSxNQUFNLEVBQUUsTUFBTSxFQUFFLFNBQVMsRUFBRSxHQUFHLE1BQU0sSUFBQSw2Q0FBd0IsRUFBQyxHQUFHLENBQUMsS0FBSyxDQUFDLENBQUMsR0FBRyxDQUFDO1FBQzFFLEtBQUssRUFBRSxFQUFFLFVBQVUsRUFBRSxHQUFHLElBQUksRUFBRTtLQUMvQixDQUFDLENBQUM7SUFFSCxHQUFHLENBQUMsSUFBSSxDQUFDLEVBQUUsU0FBUyxFQUFFLENBQUMsQ0FBQztBQUMxQixDQUFDIn0=