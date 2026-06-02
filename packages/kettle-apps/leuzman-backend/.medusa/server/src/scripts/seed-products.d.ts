/**
 * Leuzma product seed — 24 fashion products across all category branches.
 *
 * Run AFTER seed.ts and seed-categories.ts:
 *   pnpm medusa exec ./src/scripts/seed-products.ts
 *
 * Requires: default shipping profile, default sales channel, "Main Warehouse"
 * stock location, and all category handles from seed-categories.ts.
 */
import type { ExecArgs } from "@medusajs/framework/types";
export default function seedProducts({ container }: ExecArgs): Promise<void>;
