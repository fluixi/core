/**
 * assign-superadmin — one-time bootstrap script.
 *
 * Sets metadata.role = 'superadmin' on the target user so they can
 * use the /admin/users/:id/role endpoint to assign roles to others.
 *
 * Run with:
 *   EMAIL=you@example.com pnpm medusa exec ./src/scripts/assign-superadmin.ts
 *
 * If EMAIL env var is not set, the script targets the first user in the database.
 */
import type { ExecArgs } from '@medusajs/framework/types';
export default function assignSuperadmin({ container }: ExecArgs): Promise<void>;
