"use strict";
/**
 * GET /pos/products — paginated product list optimized for POS terminal
 *
 * Lighter payload than /admin/products: only POS-relevant fields.
 * Auth: Bearer token in Authorization header (same JWT as /admin).
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.GET = GET;
exports.OPTIONS = OPTIONS;
const http_1 = require("@medusajs/framework/http");
const utils_1 = require("@medusajs/framework/utils");
const ALLOWED_RE = /^https?:\/\/localhost(:\d+)?$/;
const POS_PRODUCT_FIELDS = [
    'id', 'title', 'subtitle', 'thumbnail', 'status', 'handle',
    'variants.id',
    'variants.title',
    'variants.sku',
    'variants.barcode',
    'variants.manage_inventory',
    'variants.allow_backorder',
    'variants.inventory_quantity',
    'variants.prices.*',
    'options.id',
    'options.title',
    'options.values.*',
    'categories.id',
    'categories.name',
];
function setCors(req, res) {
    const origin = req.headers?.origin ?? '';
    if (!origin || ALLOWED_RE.test(origin)) {
        res.setHeader('Access-Control-Allow-Origin', origin || '*');
        res.setHeader('Access-Control-Allow-Credentials', 'true');
        res.setHeader('Access-Control-Allow-Headers', 'authorization, content-type');
        res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    }
}
function verifyJwt(req) {
    const token = req.query?.token ??
        req.headers?.authorization?.replace(/^Bearer\s+/i, '');
    if (!token)
        return false;
    try {
        const { projectConfig: { http } } = req.scope.resolve(utils_1.ContainerRegistrationKeys.CONFIG_MODULE);
        const authCtx = (0, http_1.getAuthContextFromJwtToken)(`Bearer ${token}`, http.jwtSecret, ['bearer'], ['user'], http.jwtPublicKey, http.jwtVerifyOptions ?? http.jwtOptions);
        if (!authCtx?.actor_id)
            return false;
        req.auth_context = authCtx;
        return true;
    }
    catch {
        return false;
    }
}
async function GET(req, res) {
    setCors(req, res);
    if (!verifyJwt(req)) {
        res.status(401).json({ message: 'Unauthorized' });
        return;
    }
    const query = req.scope.resolve(utils_1.ContainerRegistrationKeys.QUERY);
    const q = req.query;
    const filters = { status: ['published'] };
    if (q.category_id) {
        filters.categories = { id: Array.isArray(q.category_id) ? q.category_id : [q.category_id] };
    }
    const limit = Math.min(parseInt(q.limit ?? '40', 10), 100);
    const offset = parseInt(q.offset ?? '0', 10);
    try {
        const { data: products, metadata } = await query.graph({
            entity: 'product',
            fields: POS_PRODUCT_FIELDS,
            filters,
            pagination: { take: limit, skip: offset },
        });
        let result = products;
        if (q.q) {
            const lower = q.q.toLowerCase();
            result = products.filter((p) => p.title?.toLowerCase().includes(lower) ||
                p.variants?.some((v) => v.sku?.toLowerCase().includes(lower) ||
                    v.barcode?.toLowerCase().includes(lower)));
        }
        res.json({ products: result, count: metadata?.count ?? result.length, limit, offset });
    }
    catch (err) {
        res.status(500).json({ message: err?.message ?? 'Internal error' });
    }
}
function OPTIONS(req, res) {
    setCors(req, res);
    res.sendStatus(204);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicm91dGUuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi9zcmMvYXBpL3Bvcy9wcm9kdWN0cy9yb3V0ZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUE7Ozs7O0dBS0c7O0FBK0RILGtCQTRDQztBQUVELDBCQUdDO0FBN0dELG1EQUFzRTtBQUN0RSxxREFBc0U7QUFFdEUsTUFBTSxVQUFVLEdBQUcsK0JBQStCLENBQUM7QUFFbkQsTUFBTSxrQkFBa0IsR0FBRztJQUN6QixJQUFJLEVBQUUsT0FBTyxFQUFFLFVBQVUsRUFBRSxXQUFXLEVBQUUsUUFBUSxFQUFFLFFBQVE7SUFDMUQsYUFBYTtJQUNiLGdCQUFnQjtJQUNoQixjQUFjO0lBQ2Qsa0JBQWtCO0lBQ2xCLDJCQUEyQjtJQUMzQiwwQkFBMEI7SUFDMUIsNkJBQTZCO0lBQzdCLG1CQUFtQjtJQUNuQixZQUFZO0lBQ1osZUFBZTtJQUNmLGtCQUFrQjtJQUNsQixlQUFlO0lBQ2YsaUJBQWlCO0NBQ2xCLENBQUM7QUFFRixTQUFTLE9BQU8sQ0FBQyxHQUFRLEVBQUUsR0FBUTtJQUNqQyxNQUFNLE1BQU0sR0FBVyxHQUFHLENBQUMsT0FBTyxFQUFFLE1BQU0sSUFBSSxFQUFFLENBQUM7SUFDakQsSUFBSSxDQUFDLE1BQU0sSUFBSSxVQUFVLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUM7UUFDdkMsR0FBRyxDQUFDLFNBQVMsQ0FBQyw2QkFBNkIsRUFBRSxNQUFNLElBQUksR0FBRyxDQUFDLENBQUM7UUFDNUQsR0FBRyxDQUFDLFNBQVMsQ0FBQyxrQ0FBa0MsRUFBRSxNQUFNLENBQUMsQ0FBQztRQUMxRCxHQUFHLENBQUMsU0FBUyxDQUFDLDhCQUE4QixFQUFFLDZCQUE2QixDQUFDLENBQUM7UUFDN0UsR0FBRyxDQUFDLFNBQVMsQ0FBQyw4QkFBOEIsRUFBRSxjQUFjLENBQUMsQ0FBQztJQUNoRSxDQUFDO0FBQ0gsQ0FBQztBQUVELFNBQVMsU0FBUyxDQUFDLEdBQVE7SUFDekIsTUFBTSxLQUFLLEdBQ1QsR0FBRyxDQUFDLEtBQUssRUFBRSxLQUFLO1FBQ2hCLEdBQUcsQ0FBQyxPQUFPLEVBQUUsYUFBYSxFQUFFLE9BQU8sQ0FBQyxhQUFhLEVBQUUsRUFBRSxDQUFDLENBQUM7SUFDekQsSUFBSSxDQUFDLEtBQUs7UUFBRSxPQUFPLEtBQUssQ0FBQztJQUV6QixJQUFJLENBQUM7UUFDSCxNQUFNLEVBQUUsYUFBYSxFQUFFLEVBQUUsSUFBSSxFQUFFLEVBQUUsR0FBRyxHQUFHLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FDbkQsaUNBQXlCLENBQUMsYUFBYSxDQUNqQyxDQUFDO1FBRVQsTUFBTSxPQUFPLEdBQUcsSUFBQSxpQ0FBMEIsRUFDeEMsVUFBVSxLQUFLLEVBQUUsRUFDakIsSUFBSSxDQUFDLFNBQVMsRUFDZCxDQUFDLFFBQVEsQ0FBQyxFQUNWLENBQUMsTUFBTSxDQUFDLEVBQ1IsSUFBSSxDQUFDLFlBQVksRUFDakIsSUFBSSxDQUFDLGdCQUFnQixJQUFJLElBQUksQ0FBQyxVQUFVLENBQ3pDLENBQUM7UUFFRixJQUFJLENBQUMsT0FBTyxFQUFFLFFBQVE7WUFBRSxPQUFPLEtBQUssQ0FBQztRQUNyQyxHQUFHLENBQUMsWUFBWSxHQUFHLE9BQU8sQ0FBQztRQUMzQixPQUFPLElBQUksQ0FBQztJQUNkLENBQUM7SUFBQyxNQUFNLENBQUM7UUFDUCxPQUFPLEtBQUssQ0FBQztJQUNmLENBQUM7QUFDSCxDQUFDO0FBRU0sS0FBSyxVQUFVLEdBQUcsQ0FBQyxHQUFrQixFQUFFLEdBQW1CO0lBQy9ELE9BQU8sQ0FBQyxHQUFHLEVBQUUsR0FBRyxDQUFDLENBQUM7SUFDbEIsSUFBSSxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDO1FBQ3BCLEdBQUcsQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFDLEVBQUUsT0FBTyxFQUFFLGNBQWMsRUFBRSxDQUFDLENBQUM7UUFDbEQsT0FBTztJQUNULENBQUM7SUFFRCxNQUFNLEtBQUssR0FBRyxHQUFHLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxpQ0FBeUIsQ0FBQyxLQUFLLENBQUMsQ0FBQztJQUNqRSxNQUFNLENBQUMsR0FBRyxHQUFHLENBQUMsS0FBWSxDQUFDO0lBRTNCLE1BQU0sT0FBTyxHQUF3QixFQUFFLE1BQU0sRUFBRSxDQUFDLFdBQVcsQ0FBQyxFQUFFLENBQUM7SUFDL0QsSUFBSSxDQUFDLENBQUMsV0FBVyxFQUFFLENBQUM7UUFDbEIsT0FBTyxDQUFDLFVBQVUsR0FBRyxFQUFFLEVBQUUsRUFBRSxLQUFLLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsV0FBVyxDQUFDLEVBQUUsQ0FBQztJQUM5RixDQUFDO0lBRUQsTUFBTSxLQUFLLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLEtBQUssSUFBSSxJQUFJLEVBQUUsRUFBRSxDQUFDLEVBQUUsR0FBRyxDQUFDLENBQUM7SUFDM0QsTUFBTSxNQUFNLEdBQUcsUUFBUSxDQUFDLENBQUMsQ0FBQyxNQUFNLElBQUksR0FBRyxFQUFFLEVBQUUsQ0FBQyxDQUFDO0lBRTdDLElBQUksQ0FBQztRQUNILE1BQU0sRUFBRSxJQUFJLEVBQUUsUUFBUSxFQUFFLFFBQVEsRUFBRSxHQUFHLE1BQU0sS0FBSyxDQUFDLEtBQUssQ0FBQztZQUNyRCxNQUFNLEVBQUUsU0FBUztZQUNqQixNQUFNLEVBQUUsa0JBQWtCO1lBQzFCLE9BQU87WUFDUCxVQUFVLEVBQUUsRUFBRSxJQUFJLEVBQUUsS0FBSyxFQUFFLElBQUksRUFBRSxNQUFNLEVBQUU7U0FDMUMsQ0FBQyxDQUFDO1FBRUgsSUFBSSxNQUFNLEdBQUcsUUFBUSxDQUFDO1FBQ3RCLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDO1lBQ1IsTUFBTSxLQUFLLEdBQUksQ0FBQyxDQUFDLENBQVksQ0FBQyxXQUFXLEVBQUUsQ0FBQztZQUM1QyxNQUFNLEdBQUcsUUFBUSxDQUFDLE1BQU0sQ0FDdEIsQ0FBQyxDQUFNLEVBQUUsRUFBRSxDQUNULENBQUMsQ0FBQyxLQUFLLEVBQUUsV0FBVyxFQUFFLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQztnQkFDdEMsQ0FBQyxDQUFDLFFBQVEsRUFBRSxJQUFJLENBQ2QsQ0FBQyxDQUFNLEVBQUUsRUFBRSxDQUNULENBQUMsQ0FBQyxHQUFHLEVBQUUsV0FBVyxFQUFFLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQztvQkFDcEMsQ0FBQyxDQUFDLE9BQU8sRUFBRSxXQUFXLEVBQUUsQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLENBQzNDLENBQ0osQ0FBQztRQUNKLENBQUM7UUFFRCxHQUFHLENBQUMsSUFBSSxDQUFDLEVBQUUsUUFBUSxFQUFFLE1BQU0sRUFBRSxLQUFLLEVBQUUsUUFBUSxFQUFFLEtBQUssSUFBSSxNQUFNLENBQUMsTUFBTSxFQUFFLEtBQUssRUFBRSxNQUFNLEVBQUUsQ0FBQyxDQUFDO0lBQ3pGLENBQUM7SUFBQyxPQUFPLEdBQVEsRUFBRSxDQUFDO1FBQ2xCLEdBQUcsQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFDLEVBQUUsT0FBTyxFQUFFLEdBQUcsRUFBRSxPQUFPLElBQUksZ0JBQWdCLEVBQUUsQ0FBQyxDQUFDO0lBQ3RFLENBQUM7QUFDSCxDQUFDO0FBRUQsU0FBZ0IsT0FBTyxDQUFDLEdBQWtCLEVBQUUsR0FBbUI7SUFDN0QsT0FBTyxDQUFDLEdBQUcsRUFBRSxHQUFHLENBQUMsQ0FBQztJQUNsQixHQUFHLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQyxDQUFDO0FBQ3RCLENBQUMifQ==