"use strict";
/**
 * GET  /pos/events   — SSE stream for POS real-time sync
 * OPTIONS /pos/events — CORS preflight
 *
 * Lives outside /admin|/store so Medusa's global middleware never touches it.
 * Exports single functions (not arrays) — Medusa's route loader skips arrays.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.broadcastPosEvent = broadcastPosEvent;
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
const clients = new Set();
function broadcastPosEvent(event) {
    const data = JSON.stringify(event);
    for (const client of clients) {
        try {
            client.res.write(`data: ${data}\n\n`);
        }
        catch {
            clients.delete(client);
        }
    }
}
// ── Route handlers — exported as plain functions so Medusa registers them ─────
function GET(req, res) {
    setCors(req, res);
    if (!verifyJwt(req)) {
        res.status(401).json({ message: 'Unauthorized' });
        return;
    }
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders?.();
    const client = { res, connectedAt: Date.now() };
    clients.add(client);
    res.write(`data: ${JSON.stringify({ type: 'connected', ts: Date.now() })}\n\n`);
    const keepAlive = setInterval(() => {
        try {
            res.write(': keep-alive\n\n');
        }
        catch {
            clearInterval(keepAlive);
            clients.delete(client);
        }
    }, 25_000);
    req.on('close', () => { clearInterval(keepAlive); clients.delete(client); });
}
function OPTIONS(req, res) {
    setCors(req, res);
    res.sendStatus(204);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicm91dGUuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi9zcmMvYXBpL3Bvcy9ldmVudHMvcm91dGUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBOzs7Ozs7R0FNRzs7QUFvREgsOENBU0M7QUFJRCxrQkEyQkM7QUFFRCwwQkFHQztBQTlGRCxtREFBc0U7QUFDdEUscURBQXNFO0FBRXRFLE1BQU0sVUFBVSxHQUFHLCtCQUErQixDQUFDO0FBRW5ELFNBQVMsT0FBTyxDQUFDLEdBQVEsRUFBRSxHQUFRO0lBQ2pDLE1BQU0sTUFBTSxHQUFXLEdBQUcsQ0FBQyxPQUFPLEVBQUUsTUFBTSxJQUFJLEVBQUUsQ0FBQztJQUNqRCxJQUFJLENBQUMsTUFBTSxJQUFJLFVBQVUsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQztRQUN2QyxHQUFHLENBQUMsU0FBUyxDQUFDLDZCQUE2QixFQUFPLE1BQU0sSUFBSSxHQUFHLENBQUMsQ0FBQztRQUNqRSxHQUFHLENBQUMsU0FBUyxDQUFDLGtDQUFrQyxFQUFFLE1BQU0sQ0FBQyxDQUFDO1FBQzFELEdBQUcsQ0FBQyxTQUFTLENBQUMsOEJBQThCLEVBQU0sNkJBQTZCLENBQUMsQ0FBQztRQUNqRixHQUFHLENBQUMsU0FBUyxDQUFDLDhCQUE4QixFQUFNLGNBQWMsQ0FBQyxDQUFDO0lBQ3BFLENBQUM7QUFDSCxDQUFDO0FBRUQsU0FBUyxTQUFTLENBQUMsR0FBUTtJQUN6QixNQUFNLEtBQUssR0FDVCxHQUFHLENBQUMsS0FBSyxFQUFFLEtBQUs7UUFDaEIsR0FBRyxDQUFDLE9BQU8sRUFBRSxhQUFhLEVBQUUsT0FBTyxDQUFDLGFBQWEsRUFBRSxFQUFFLENBQUMsQ0FBQztJQUV6RCxJQUFJLENBQUMsS0FBSztRQUFFLE9BQU8sS0FBSyxDQUFDO0lBRXpCLElBQUksQ0FBQztRQUNILE1BQU0sRUFBRSxhQUFhLEVBQUUsRUFBRSxJQUFJLEVBQUUsRUFBRSxHQUFHLEdB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