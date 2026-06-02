/**
 * Rich category seed script — multilingual fashion hierarchy.
 *
 * Run with:
 *   pnpm medusa exec ./src/scripts/seed-categories.ts
 *
 * Creates a 3-level category tree with FR/EN/AR translations stored in metadata.
 * Safe to run multiple times (skips existing handles).
 */
import type { ExecArgs } from "@medusajs/framework/types";
export default function seedCategories({ container }: ExecArgs): Promise<void>;
