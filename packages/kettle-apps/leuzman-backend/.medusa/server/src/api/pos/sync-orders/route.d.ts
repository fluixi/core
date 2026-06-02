/**
 * POST /pos/sync-orders — batch offline order sync endpoint
 *
 * Accepts an array of pending orders (each with idempotency_key).
 * Creates draft orders, completes them, and registers payment.
 * Returns per-order success/failure.
 */
import type { MedusaRequest, MedusaResponse } from '@medusajs/framework/http';
export declare function POST(req: MedusaRequest, res: MedusaResponse): Promise<void>;
export declare function OPTIONS(req: MedusaRequest, res: MedusaResponse): void;
