/**
 * GET /pos/products — paginated product list optimized for POS terminal
 *
 * Lighter payload than /admin/products: only POS-relevant fields.
 * Auth: Bearer token in Authorization header (same JWT as /admin).
 */

import type { MedusaRequest, MedusaResponse } from '@medusajs/framework/http';
import { getAuthContextFromJwtToken } from '@medusajs/framework/http';
import { ContainerRegistrationKeys } from '@medusajs/framework/utils';

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

  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY);
  const q = req.query as any;

  const filters: Record<string, any> = { status: ['published'] };
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
      const lower = (q.q as string).toLowerCase();
      result = products.filter(
        (p: any) =>
          p.title?.toLowerCase().includes(lower) ||
          p.variants?.some(
            (v: any) =>
              v.sku?.toLowerCase().includes(lower) ||
              v.barcode?.toLowerCase().includes(lower),
          ),
      );
    }

    res.json({ products: result, count: metadata?.count ?? result.length, limit, offset });
  } catch (err: any) {
    res.status(500).json({ message: err?.message ?? 'Internal error' });
  }
}

export function OPTIONS(req: MedusaRequest, res: MedusaResponse) {
  setCors(req, res);
  res.sendStatus(204);
}
