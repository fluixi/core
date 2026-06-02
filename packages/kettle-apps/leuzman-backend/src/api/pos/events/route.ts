/**
 * GET  /pos/events   — SSE stream for POS real-time sync
 * OPTIONS /pos/events — CORS preflight
 *
 * Lives outside /admin|/store so Medusa's global middleware never touches it.
 * Exports single functions (not arrays) — Medusa's route loader skips arrays.
 */

import type { MedusaRequest, MedusaResponse } from '@medusajs/framework/http';
import { getAuthContextFromJwtToken } from '@medusajs/framework/http';
import { ContainerRegistrationKeys } from '@medusajs/framework/utils';

const ALLOWED_RE =/^(https?:\/\/localhost(:\d+)?|https?:\/\/(.+\.)?leuzma\.com)$/;

function setCors(req: any, res: any) {
  const origin: string = req.headers?.origin ?? '';
  if (!origin || ALLOWED_RE.test(origin)) {
    res.setHeader('Access-Control-Allow-Origin',      origin || '*');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Headers',     'authorization, content-type');
    res.setHeader('Access-Control-Allow-Methods',     'GET, OPTIONS');
  }
}

function verifyJwt(req: any): boolean {
  const token: string | undefined =
    req.query?.token ??
    req.headers?.authorization?.replace(/^Bearer\s+/i, '');

  if (!token) return false;

  try {
    const { projectConfig: { http } } = req.scope.resolve(
      ContainerRegistrationKeys.CONFIG_MODULE
    ) as any;

    const authCtx = getAuthContextFromJwtToken(
      `Bearer ${token}`,
      http.jwtSecret,
      ['bearer'],
      ['user'],
      http.jwtPublicKey,
      http.jwtVerifyOptions ?? http.jwtOptions
    );

    if (!authCtx?.actor_id) return false;
    req.auth_context = authCtx;
    return true;
  } catch {
    return false;
  }
}

// ── SSE client registry ───────────────────────────────────────────────────────

type SseClient = { res: MedusaResponse; connectedAt: number };
const clients = new Set<SseClient>();

export function broadcastPosEvent(event: Record<string, unknown>) {
  const data = JSON.stringify(event);
  for (const client of clients) {
    try {
      (client.res as any).write(`data: ${data}\n\n`);
    } catch {
      clients.delete(client);
    }
  }
}

// ── Route handlers — exported as plain functions so Medusa registers them ─────

export function GET(req: MedusaRequest, res: MedusaResponse) {
  setCors(req, res);

  if (!verifyJwt(req)) {
    res.status(401).json({ message: 'Unauthorized' });
    return;
  }

  res.setHeader('Content-Type',      'text/event-stream');
  res.setHeader('Cache-Control',     'no-cache, no-transform');
  res.setHeader('Connection',        'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders?.();

  const client: SseClient = { res, connectedAt: Date.now() };
  clients.add(client);

  (res as any).write(
    `data: ${JSON.stringify({ type: 'connected', ts: Date.now() })}\n\n`
  );

  const keepAlive = setInterval(() => {
    try { (res as any).write(': keep-alive\n\n'); }
    catch { clearInterval(keepAlive); clients.delete(client); }
  }, 25_000);

  req.on('close', () => { clearInterval(keepAlive); clients.delete(client); });
}

export function OPTIONS(req: MedusaRequest, res: MedusaResponse) {
  setCors(req, res);
  res.sendStatus(204);
}
