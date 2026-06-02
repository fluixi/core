/**
 * GET /admin/custom
 *
 * Example custom admin endpoint — extend with business logic as needed.
 * All built-in Medusa Admin endpoints (/admin/products, /admin/orders, etc.)
 * are automatically provided by @medusajs/medusa.
 */

import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
// import { authenticate } from "@medusajs/framework/http";

// export async function GET(
//   req: MedusaRequest,
//   res: MedusaResponse
// ) {
//   res.sendStatus(200);
// }

// export const GET = [
//   authenticate("user", ["api-key"]),
//   (req: MedusaRequest, res: MedusaResponse) => {
//     res.json({ message: "Leuzman Admin API is running." });
//   },
// ] as any;

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  res.json({ message: `Leuzma Admin API is running.` });
};
