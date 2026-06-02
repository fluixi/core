/**
 * GET  /pos/events   — SSE stream for POS real-time sync
 * OPTIONS /pos/events — CORS preflight
 *
 * Lives outside /admin|/store so Medusa's global middleware never touches it.
 * Exports single functions (not arrays) — Medusa's route loader skips arrays.
 */
import type { MedusaRequest, MedusaResponse } from '@medusajs/framework/http';
export declare function broadcastPosEvent(event: Record<string, unknown>): void;
export declare function GET(req: MedusaRequest, res: MedusaResponse): void;
export declare function OPTIONS(req: MedusaRequest, res: MedusaResponse): void;
