/**
 * GET /pos/inventory?variant_id[]=...&variant_id[]=...
 *
 * Returns stocked_quantity for a list of variant IDs.
 * Optimized for the POS to check stock before checkout.
 */
import type { MedusaRequest, MedusaResponse } from '@medusajs/framework/http';
export declare function GET(req: MedusaRequest, res: MedusaResponse): Promise<void>;
export declare function OPTIONS(req: MedusaRequest, res: MedusaResponse): void;
