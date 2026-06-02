/**
 * GET /pos/products — paginated product list optimized for POS terminal
 *
 * Lighter payload than /admin/products: only POS-relevant fields.
 * Auth: Bearer token in Authorization header (same JWT as /admin).
 */
import type { MedusaRequest, MedusaResponse } from '@medusajs/framework/http';
export declare function GET(req: MedusaRequest, res: MedusaResponse): Promise<void>;
export declare function OPTIONS(req: MedusaRequest, res: MedusaResponse): void;
