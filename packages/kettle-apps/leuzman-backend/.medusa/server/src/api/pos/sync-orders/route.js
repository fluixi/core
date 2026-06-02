"use strict";
/**
 * POST /pos/sync-orders — batch offline order sync endpoint
 *
 * Accepts an array of pending orders (each with idempotency_key).
 * Creates draft orders, completes them, and registers payment.
 * Returns per-order success/failure.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.POST = POST;
exports.OPTIONS = OPTIONS;
const http_1 = require("@medusajs/framework/http");
const utils_1 = require("@medusajs/framework/utils");
// import { createDraftOrderWorkflow } from '@medusajs/medusa/core-flows';
const ALLOWED_RE = /^https?:\/\/localhost(:\d+)?$/;
function setCors(req, res) {
    const origin = req.headers?.origin ?? '';
    if (!origin || ALLOWED_RE.test(origin)) {
        res.setHeader('Access-Control-Allow-Origin', origin || '*');
        res.setHeader('Access-Control-Allow-Credentials', 'true');
        res.setHeader('Access-Control-Allow-Headers', 'authorization, content-type');
        res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
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
async function POST(req, res) {
    setCors(req, res);
    if (!verifyJwt(req)) {
        res.status(401).json({ message: 'Unauthorized' });
        return;
    }
    const orders = req.body?.orders ?? [];
    if (!Array.isArray(orders) || orders.length === 0) {
        res.status(400).json({ message: 'orders array required' });
        return;
    }
    const results = [];
    for (const pending of orders) {
        try {
            const { idempotency_key, ...payload } = pending;
            // POST to /admin/draft-orders then complete + pay via admin API internals
            const draftOrderService = req.scope.resolve(utils_1.Modules.ORDER);
            // Use admin API approach — create draft order, then complete
            const draftRes = await fetch(`http://localhost:${req.socket.localPort ?? 9000}/admin/draft-orders`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': req.headers.authorization ?? '',
                    'Idempotency-Key': idempotency_key,
                },
                body: JSON.stringify({ ...payload, no_notification: true }),
            });
            if (!draftRes.ok) {
                const err = await draftRes.json().catch(() => ({}));
                throw new Error(err?.message ?? `Draft order failed: ${draftRes.status}`);
            }
            const { draft_order } = (await draftRes.json());
            await fetch(`http://localhost:${req.socket.localPort ?? 9000}/admin/draft-orders/${draft_order.id}/complete`, {
                method: 'POST',
                headers: { 'Authorization': req.headers.authorization ?? '' },
            });
            await fetch(`http://localhost:${req.socket.localPort ?? 9000}/admin/draft-orders/${draft_order.id}/pay`, {
                method: 'POST',
                headers: { 'Authorization': req.headers.authorization ?? '' },
            });
            results.push({ idempotency_key, status: 'ok', order_id: draft_order.order_id });
        }
        catch (err) {
            results.push({ idempotency_key: pending.idempotency_key, status: 'error', error: err?.message });
        }
    }
    res.json({ results });
}
function OPTIONS(req, res) {
    setCors(req, res);
    res.sendStatus(204);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicm91dGUuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi9zcmMvYXBpL3Bvcy9zeW5jLW9yZGVycy9yb3V0ZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUE7Ozs7OztHQU1HOztBQXVESCxvQkFrRUM7QUFFRCwwQkFHQztBQTNIRCxtREFBc0U7QUFDdEUscURBQStFO0FBQy9FLDBFQUEwRTtBQUUxRSxNQUFNLFVBQVUsR0FBRywrQkFBK0IsQ0FBQztBQUVuRCxTQUFTLE9BQU8sQ0FBQyxHQUFRLEVBQUUsR0FBUTtJQUNqQyxNQUFNLE1BQU0sR0FBVyxHQUFHLENBQUMsT0FBTyxFQUFFLE1BQU0sSUFBSSxFQUFFLENBQUM7SUFDakQsSUFBSSxDQUFDLE1BQU0sSUFBSSxVQUFVLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUM7UUFDdkMsR0FBRyxDQUFDLFNBQVMsQ0FBQyw2QkFBNkIsRUFBRSxNQUFNLElBQUksR0FBRyxDQUFDLENBQUM7UUFDNUQsR0FBRyxDQUFDLFNBQVMsQ0FBQyxrQ0FBa0MsRUFBRSxNQUFNLENBQUMsQ0FBQztRQUMxRCxHQUFHLENBQUMsU0FBUyxDQUFDLDhCQUE4QixFQUFFLDZCQUE2QixDQUFDLENBQUM7UUFDN0UsR0FBRyxDQUFDLFNBQVMsQ0FBQyw4QkFBOEIsRUFBRSxlQUFlLENBQUMsQ0FBQztJQUNqRSxDQUFDO0FBQ0gsQ0FBQztBQUVELFNBQVMsU0FBUyxDQUFDLEdBQVE7SUFDekIsTUFBTSxLQUFLLEdBQ1QsR0FBRyxDQUFDLEtBQUssRUFBRSxLQUFLO1FBQ2hCLEdBQUcsQ0FBQyxPQUFPLEVBQUUsYUFBYSxFQUFFLE9BQU8sQ0FBQyxhQUFhLEVBQUUsRUFBRSxDQUFDLENBQUM7SUFDekQsSUFBSSxDQUFDLEtBQUs7UUFBRSxPQUFPLEtBQUssQ0FBQztJQUV6QixJQUFJLENBQUM7UUFDSCxNQUFNLEVBQUUsYUFBYSxFQUFFLEVBQUUsSUFBSSxFQUFFLEVBQUUsR0FBRyxHQUFHLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FDbkQsaUNBQXlCLENBQUMsYUFBYSxDQUNqQyxDQUFDO1FBRVQsTUFBTSxPQUFPLEdBQUcsSUFBQSxpQ0FBMEIsRUFDeEMsVUFBVSxLQUFLLEVBQUUsRUFDakIsSUFBSSxDQUFDLFNBQVMsRUFDZCxDQUFDLFFBQVEsQ0FBQyxFQUNWLENBQUMsTUFBTSxDQUFDLEVBQ1IsSUFBSSxDQUFDLFlBQVksRUFDakIsSUFBSSxDQUFDLGdCQUFnQixJQUFJLElBQUksQ0FBQyxVQUFVLENBQ3pDLENBQUM7UUFFRixJQUFJLENBQUMsT0FBTyxFQUFFLFFBQVE7WUFBRSxPQUFPLEtBQUssQ0FBQztRQUNyQyxHQUFHLENBQUMsWUFBWSxHQUFHLE9BQU8sQ0FBQztRQUMzQixPQUFPLElBQUksQ0FBQztJQUNkLENBQUM7SUFBQyxNQUFNLENBQUM7UUFDUCxPQUFPLEtBQUssQ0FBQztJQUNmLENBQUM7QUFDSCxDQUFDO0FBVU0sS0FBSyxVQUFVLElBQUksQ0FBQyxHQUFrQixFQUFFLEdBQW1CO0lBQ2hFLE9BQU8sQ0FBQyxHQUFHLEVBQUUsR0FBRyxDQUFDLENBQUM7SUFDbEIsSUFBSSxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDO1FBQ3BCLEdBQUcsQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFDLEVBQUUsT0FBTyxFQUFFLGNBQWMsRUFBRSxDQUFDLENBQUM7UUFDbEQsT0FBTztJQUNULENBQUM7SUFFRCxNQUFNLE1BQU0sR0FBMkIsR0FBRyxDQUFDLElBQVksRUFBRSxNQUFNLElBQUksRUFBRSxDQUFDO0lBQ3RFLElBQUksQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxJQUFJLE1BQU0sQ0FBQyxNQUFNLEtBQUssQ0FBQyxFQUFFLENBQUM7UUFDbEQsR0FBRyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUMsRUFBRSxPQUFPLEVBQUUsdUJBQXVCLEVBQUUsQ0FBQyxDQUFDO1FBQzNELE9BQU87SUFDVCxDQUFDO0lBRUQsTUFBTSxPQUFPLEdBQTZGLEVBQUUsQ0FBQztJQUU3RyxLQUFLLE1BQU0sT0FBTyxJQUFJLE1BQU0sRUFBRSxDQUFDO1FBQzdCLElBQUksQ0FBQztZQUNILE1BQU0sRUFBRSxlQUFlLEVBQUUsR0FBRyxPQUFPLEVBQUUsR0FBRyxPQUFPLENBQUM7WUFFaEQsMEVBQTBFO1lBQzFFLE1BQU0saUJBQWlCLEdBQUcsR0FBRyxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsZUFBTyxDQUFDLEtBQUssQ0FBUSxDQUFDO1lBRWxFLDZEQUE2RDtZQUM3RCxNQUFNLFFBQVEsR0FBRyxNQUFNLEtBQUssQ0FDMUIsb0JBQXFCLEdBQUcsQ0FBQyxNQUFjLENBQUMsU0FBUyxJQUFJLElBQUkscUJBQXFCLEVBQzlFO2dCQUNFLE1BQU0sRUFBRSxNQUFNO2dCQUNkLE9BQU8sRUFBRTtvQkFDUCxjQUFjLEVBQUUsa0JBQWtCO29CQUNsQyxlQUFlLEVBQUUsR0FBRyxDQUFDLE9BQU8sQ0FBQyxhQUFhLElBQUksRUFBRTtvQkFDaEQsaUJBQWlCLEVBQUUsZUFBZTtpQkFDbkM7Z0JBQ0QsSUFBSSxFQUFFLElBQUksQ0FBQyxTQUFTLENBQUMsRUFBRSxHQUFHLE9BQU8sRUFBRSxlQUFlLEVBQUUsSUFBSSxFQUFFLENBQUM7YUFDNUQsQ0FDRixDQUFDO1lBRUYsSUFBSSxDQUFDLFFBQVEsQ0FBQyxFQUFFLEVBQUUsQ0FBQztnQkFDakIsTUFBTSxHQUFHLEdBQUcsTUFBTSxRQUFRLENBQUMsSUFBSSxFQUFFLENBQUMsS0FBSyxDQUFDLEdBQUcsRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztnQkFDcEQsTUFBTSxJQUFJLEtBQUssQ0FBRSxHQUFXLEVBQUUsT0FBTyxJQUFJLHVCQUF1QixRQUFRLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQztZQUNyRixDQUFDO1lBRUQsTUFBTSxFQUFFLFdBQVcsRUFBRSxHQUFHLENBQUMsTUFBTSxRQUFRLENBQUMsSUFBSSxFQUFFLENBQVEsQ0FBQztZQUV2RCxNQUFNLEtBQUssQ0FDVCxvQkFBcUIsR0FBRyxDQUFDLE1BQWMsQ0FBQyxTQUFTLElBQUksSUFBSSx1QkFBdUIsV0FBVyxDQUFDLEVBQUUsV0FBVyxFQUN6RztnQkFDRSxNQUFNLEVBQUUsTUFBTTtnQkFDZCxPQUFPLEVBQUUsRUFBRSxlQUFlLEVBQUUsR0FBRyxDQUFDLE9BQU8sQ0FBQyxhQUFhLElBQUksRUFBRSxFQUFFO2FBQzlELENBQ0YsQ0FBQztZQUVGLE1BQU0sS0FBSyxDQUNULG9CQUFxQixHQUFHLENBQUMsTUFBYyxDQUFDLFNBQVMsSUFBSSxJQUFJLHVCQUF1QixXQUFXLENBQUMsRUFBRSxNQUFNLEVBQ3BHO2dCQUNFLE1BQU0sRUFBRSxNQUFNO2dCQUNkLE9BQU8sRUFBRSxFQUFFLGVBQWUsRUFBRSxHQUFHLENBQUMsT0FBTyxDQUFDLGFBQWEsSUFBSSxFQUFFLEVBQUU7YUFDOUQsQ0FDRixDQUFDO1lBRUYsT0FBTyxDQUFDLElBQUksQ0FBQyxFQUFFLGVBQWUsRUFBRSxNQUFNLEVBQUUsSUFBSSxFQUFFLFFBQVEsRUFBRSxXQUFXLENBQUMsUUFBUSxFQUFFLENBQUMsQ0FBQztRQUNsRixDQUFDO1FBQUMsT0FBTyxHQUFRLEVBQUUsQ0FBQztZQUNsQixPQUFPLENBQUMsSUFBSSxDQUFDLEVBQUUsZUFBZSxFQUFFLE9BQU8sQ0FBQyxlQUFlLEVBQUUsTUFBTSxFQUFFLE9BQU8sRUFBRSxLQUFLLEVBQUUsR0FBRyxFQUFFLE9BQU8sRUFBRSxDQUFDLENBQUM7UUFDbkcsQ0FBQztJQUNILENBQUM7SUFFRCxHQUFHLENBQUMsSUFBSSxDQUFDLEVBQUUsT0FBTyxFQUFFLENBQUMsQ0FBQztBQUN4QixDQUFDO0FBRUQsU0FBZ0IsT0FBTyxDQUFDLEdBQWtCLEVBQUUsR0FBbUI7SUFDN0QsT0FBTyxDQUFDLEdBQUcsRUFBRSxHQUFHLENBQUMsQ0FBQztJQUNsQixHQUFHLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQyxDQUFDO0FBQ3RCLENBQUMifQ==