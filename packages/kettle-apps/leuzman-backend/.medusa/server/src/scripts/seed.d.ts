/**
 * Seed script — creates all required data for a working Medusa v2 store.
 *
 * Run with:
 *   pnpm seed
 *   # or: pnpm medusa exec ./src/scripts/seed.ts
 *
 * After completion, copy the printed publishable API key into
 *   storefront/.env    → VITE_PUBLISHABLE_KEY=pk_...
 *   store-admin/.env   → VITE_PUBLISHABLE_KEY=pk_...
 */
import * as MedusaTypes from "@medusajs/framework/types";
export default function seedDemoData({ container }: MedusaTypes.ExecArgs): Promise<void>;
