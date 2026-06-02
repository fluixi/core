/**
 * GET /pos/inventory?variant_id[]=...&variant_id[]=...
 *
 * Returns stocked_quantity for a list of variant IDs.
 * Optimized for the POS to check stock before checkout.
 */

import type { MedusaRequest, MedusaResponse } from '@medusajs/framework/http';
import { getAuthContextFromJwtToken } from '@medusajs/framework/http';
import { ContainerRegistrationKeys } from '@medusajs/framework/utils';

const ALLOWED_RE = /^https?:\/\/localhost(:\d+)?$/;

function setCors(req: any, res: any) {
  const origin: string = req.headers?.origin ?? '';
  if (!origin || ALLOWED_RE.test(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin || '*');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Headers', 'authorization, content-type');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
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

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  setCors(req, res);
  if (!verifyJwt(req)) {
    res.status(401).json({ message: 'Unauthorized' });
    return;
  }

  const q = req.query as any;
  const variantIds: string[] = Array.isArray(q['variant_id[]'])
    ? q['variant_id[]']
    : q['variant_id[]']
    ? [q['variant_id[]']]
    : [];

  if (variantIds.length === 0) {
    res.json({ inventory: [] });
    return;
  }

  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY);

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

    const inventory = items.map((item: any) => ({
      variant_id: item.variant_id,
      stocked_quantity: item.stocked_quantity ?? 0,
      reserved_quantity: item.reserved_quantity ?? 0,
      available: Math.max(0, (item.stocked_quantity ?? 0) - (item.reserved_quantity ?? 0)),
    }));

    res.json({ inventory });
  } catch (err: any) {
    res.status(500).json({ message: err?.message ?? 'Internal error' });
  }
}

export function OPTIONS(req: MedusaRequest, res: MedusaResponse) {
  setCors(req, res);
  res.sendStatus(204);
}
