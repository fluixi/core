/**
 * POST /pos/sync-orders — batch offline order sync endpoint
 *
 * Accepts an array of pending orders (each with idempotency_key).
 * Creates draft orders, completes them, and registers payment.
 * Returns per-order success/failure.
 */

import type { MedusaRequest, MedusaResponse } from '@medusajs/framework/http';
import { getAuthContextFromJwtToken } from '@medusajs/framework/http';
import { ContainerRegistrationKeys } from '@medusajs/framework/utils';
// import { createDraftOrderWorkflow } from '@medusajs/medusa/core-flows';

function setCors(req: any, res: any) {
  const origin: string = req.headers?.origin ?? '';
  if (!origin) {
    // Non-browser clients (React Native, curl, server-to-server) — no Origin header, allow unconditionally
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', 'authorization, content-type');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    return;
  }

  // For browser clients, check against Medusa's configured admin CORS origins
  const config = req.scope.resolve(ContainerRegistrationKeys.CONFIG_MODULE) as any;
  const allowedOrigins: string[] = [
    ...(config?.projectConfig?.http?.adminCors?.split(',').map((s: string) => s.trim()) ?? []),
    'http://localhost',
  ];

  const allowed = allowedOrigins.some((allowed) => {
    if (allowed === origin) return true;
    // Support wildcard subdomains like *.leuzma.com
    if (allowed.startsWith('*.')) {
      const base = allowed.slice(1);
      return origin.endsWith(base);
    }
    return false;
  });

  if (allowed) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Headers', 'authorization, content-type');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  }
}

function verifyJwt(req: any): boolean {
  const token: string | undefined =
    req.query?.token ??
    req.headers?.authorization?.replace(/^Bearer\s+/i, '');
  if (!token) return false;

  try {
    const { projectConfig: { http } } = req.scope.resolve(
      ContainerRegistrationKeys.CONFIG_MODULE,
    ) as any;

    const authCtx = getAuthContextFromJwtToken(
      `Bearer ${token}`,
      http.jwtSecret,
      ['bearer'],
      ['user'],
      http.jwtPublicKey,
      http.jwtVerifyOptions ?? http.jwtOptions,
    );

    if (!authCtx?.actor_id) return false;
    req.auth_context = authCtx;
    return true;
  } catch {
    return false;
  }
}

interface PendingOrderPayload {
  idempotency_key: string;
  email?: string;
  customer_id?: string;
  region_id: string;
  items: { variant_id: string; quantity: number; unit_price: number }[];
  promo_codes?: string[];
  metadata?: Record<string, unknown>;
  no_notification_order?: boolean;
}

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  setCors(req, res);
  if (!verifyJwt(req)) {
    res.status(401).json({ message: 'Unauthorized' });
    return;
  }

  const orders: PendingOrderPayload[] = (req.body as any)?.orders ?? [];
  if (!Array.isArray(orders) || orders.length === 0) {
    res.status(400).json({ message: 'orders array required' });
    return;
  }

  const results: { idempotency_key: string; status: 'ok' | 'error'; order_id?: string; error?: string }[] = [];

  for (const pending of orders) {
    try {
      const { idempotency_key, ...payload } = pending;

      const base = `http://localhost:${(req.socket as any).localPort ?? 9000}`;
      const auth = req.headers.authorization ?? '';

      // 1. Create draft order
      const draftRes = await fetch(`${base}/admin/draft-orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': auth, 'Idempotency-Key': idempotency_key },
        body: JSON.stringify({ ...payload, no_notification_order: true }),
      });
      if (!draftRes.ok) {
        const err = await draftRes.json().catch(() => ({}));
        throw new Error((err as any)?.message ?? `Draft order failed: ${draftRes.status}`);
      }
      const { draft_order } = (await draftRes.json()) as any;

      // 2. Convert to real order (Medusa v2 — replaces /complete)
      const convertRes = await fetch(
        `${base}/admin/draft-orders/${draft_order.id}/convert-to-order?fields=id,*payment_collections`,
        { method: 'POST', headers: { 'Authorization': auth } },
      );
      if (!convertRes.ok) {
        const err = await convertRes.json().catch(() => ({}));
        throw new Error((err as any)?.message ?? `Convert failed: ${convertRes.status}`);
      }
      const { order } = (await convertRes.json()) as any;

      // 3. Mark payment collection as paid (Medusa v2 — replaces /pay)
      const paymentCollectionId = order?.payment_collections?.[0]?.id;
      if (paymentCollectionId) {
        await fetch(
          `${base}/admin/payment-collections/${paymentCollectionId}/mark-as-paid`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': auth },
            body: JSON.stringify({ order_id: order.id }),
          },
        );
      }

      results.push({ idempotency_key, status: 'ok', order_id: order.id });
    } catch (err: any) {
      results.push({ idempotency_key: pending.idempotency_key, status: 'error', error: err?.message });
    }
  }

  res.json({ results });
}

export function OPTIONS(req: MedusaRequest, res: MedusaResponse) {
  setCors(req, res);
  res.sendStatus(204);
}
