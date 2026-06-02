/**
 * GET /store/custom
 *
 * Example custom store endpoint — extend with business logic as needed.
 * All built-in Medusa Store endpoints (/store/products, /store/carts, etc.)
 * are automatically provided by @medusajs/medusa.
 */

import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";

export const GET = (req: MedusaRequest, res: MedusaResponse) => {
  res.json({ message: "Leuzman Store API is running." });
};
