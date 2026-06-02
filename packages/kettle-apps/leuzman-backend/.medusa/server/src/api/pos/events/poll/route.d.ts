/**
 * GET     /pos/events/poll?after=<cursor>  — polling fallback
 * OPTIONS /pos/events/poll                 — CORS preflight
 *
 * Exported as plain functions (Medusa skips array exports).
 */
import type { MedusaRequest, MedusaResponse } from '@medusajs/framework/http';
export declare function enqueueEvent(type: string, payload: Record<string, unknown>): void;
export declare function GET(req: MedusaRequest, res: MedusaResponse): void;
export declare function OPTIONS(req: MedusaRequest, res: MedusaResponse): void;
