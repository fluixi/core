"use strict";
/**
 * GET /pos/inventory?variant_id[]=...&variant_id[]=...
 *
 * Returns stocked_quantity for a list of variant IDs.
 * Optimized for the POS to check stock before checkout.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.GET = GET;
exports.OPTIONS = OPTIONS;
const http_1 = require("@medusajs/framework/http");
const utils_1 = require("@medusajs/framework/utils");
const ALLOWED_RE = /^https?:\/\/localhost(:\d+)?$/;
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
    const q = req.query;
    const variantIds = Array.isArray(q['variant_id[]'])
        ? q['variant_id[]']
        : q['variant_id[]']
            ? [q['variant_id[]']]
            : [];
    if (variantIds.length === 0) {
        res.json({ inventory: [] });
        return;
    }
    const query = req.scope.resolve(utils_1.ContainerRegistrationKeys.QUERY);
    try {
        const { data: items } = await query.graph({
            entity: 'inventory_item',
            fields: [
                'id',
                'variant_id',
                'stocked_quantity',
                'reserved_quantity',
                'location_levels.stocked_quantity',
                'location_levels.reserved_quantity',
            ],
            filters: { variant_id: variantIds },
        });
        const inventory = items.map((item) => ({
            variant_id: item.variant_id,
            stocked_quantity: item.stocked_quantity ?? 0,
            reserved_quantity: item.reserved_quantity ?? 0,
            available: Math.max(0, (item.stocked_quantity ?? 0) - (item.reserved_quantity ?? 0)),
        }));
        res.json({ inventory });
    }
    catch (err) {
        res.status(500).json({ message: err?.message ?? 'Internal error' });
    }
}
function OPTIONS(req, res) {
    setCors(req, res);
    res.sendStatus(204);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicm91dGUuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi9zcmMvYXBpL3Bvcy9pbnZlbnRvcnkvcm91dGUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBOzs7OztHQUtHOztBQThDSCxrQkE4Q0M7QUFFRCwwQkFHQztBQTlGRCxtREFBc0U7QUFDdEUscURBQXNFO0FBRXRFLE1BQU0sVUFBVSxHQUFHLCtCQUErQixDQUFDO0FBRW5ELFNBQVMsT0FBTyxDQUFDLEdBQVEsRUFBRSxHQUFRO0lBQ2pDLE1BQU0sTUFBTSxHQUFXLEdBQUcsQ0FBQyxPQUFPLEVBQUUsTUFBTSxJQUFJLEVBQUUsQ0FBQztJQUNqRCxJQUFJLENBQUMsTUFBTSxJQUFJLFVBQVUsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQztRQUN2QyxHQUFHLENBQUMsU0FBUyxDQUFDLDZCQUE2QixFQUFFLE1BQU0sSUFBSSxHQUFHLENBQUMsQ0FBQztRQUM1RCxHQUFHLENBQUMsU0FBUyxDQUFDLGtDQUFrQyxFQUFFLE1BQU0sQ0FBQyxDQUFDO1FBQzFELEdBQUcsQ0FBQyxTQUFTLENBQUMsOEJBQThCLEVBQUUsNkJBQTZCLENBQUMsQ0FBQztRQUM3RSxHQUFHLENBQUMsU0FBUyxDQUFDLDhCQUE4QixFQUFFLGNBQWMsQ0FBQyxDQUFDO0lBQ2hFLENBQUM7QUFDSCxDQUFDO0FBRUQsU0FBUyxTQUFTLENBQUMsR0FBUTtJQUN6QixNQUFNLEtBQUssR0FDVCxHQUFHLENBQUMsS0FBSyxFQUFFLEtBQUs7UUFDaEIsR0FBRyxDQUFDLE9BQU8sRUFBRSxhQUFhLEVBQUUsT0FBTyxDQUFDLGFBQWEsRUFBRSxFQUFFLENBQUMsQ0FBQztJQUN6RCxJQUFJLENBQUMsS0FBSztRQUFFLE9BQU8sS0FBSyxDQUFDO0lBRXpCLElBQUksQ0FBQztRQUNILE1BQU0sRUFBRSxhQUFhLEVBQUUsRUFBRSxJQUFJLEVBQUUsRUFBRSxHQUFHLEdBQUcsQ0FBQyxL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