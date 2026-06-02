/**
 * GET     /pos/events/poll?after=<cursor>  — polling fallback
 * OPTIONS /pos/events/poll                 — CORS preflight
 *
 * Exported as plain functions (Medusa skips array exports).
 */

import type { MedusaRequest, MedusaResponse } from '@medusajs/framework/http';
import { getAuthContextFromJwtToken } from '@medusajs/framework/http';
import { ContainerRegistrationKeys } from '@medusajs/framework/utils';

const ALLOWED_RE = /^https?:\/\/localhost(:\d+)?$/;

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

// ── Event buffer ──────────────────────────────────────────────────────────────

interface StoredEvent { id: number; type: string; payload: Record<string, unknown> }

const MAX_EVENTS  = 500;
const eventBuffer: StoredEvent[] = [];
let   eventSeq    = 0;

export function enqueueEvent(type: string, payload: Record<string, unknown>) {
  eventBuffer.push({ id: ++eventSeq, type, payload });
  if (eventBuffer.length > MAX_EVENTS) eventBuffer.shift();
}

// ── Route handlers ────────────────────────────────────────────────────────────

export function GET(req: MedusaRequest, res: MedusaResponse) {
  setCors(req, res);

  if (!verifyJwt(req)) {
    res.status(401).json({ message: 'Unauthorized' });
    return;
  }

  const afterId = parseInt((req.query as any)?.after ?? '0', 10);

  const events = eventBuffer
    .filter(e => e.id > afterId)
    .map(e => ({ type: e.type, ...e.payload }));

  const cursor = eventBuffer.length > 0
    ? String(eventBuffer[eventBuffer.length - 1].id)
    : String(afterId);

  res.json({ events, cursor });
}

export function OPTIONS(req: MedusaRequest, res: MedusaResponse) {
  setCors(req, res);
  res.sendStatus(204);
}
