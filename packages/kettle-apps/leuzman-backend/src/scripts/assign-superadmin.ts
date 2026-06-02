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
import { Modules, ContainerRegistrationKeys } from '@medusajs/framework/utils';
import { updateUserRoleWorkflow } from '../workflows/update-user-role';

export default async function assignSuperadmin({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  const userModule = container.resolve(Modules.USER);

  const targetEmail = process.env.EMAIL;
  const users = targetEmail
    ? await userModule.listUsers({ email: targetEmail })
    : await userModule.listUsers({}, { take: 1 });

  if (!users.length) {
    logger.error(targetEmail
      ? `No user found with email: ${targetEmail}`
      : 'No users found in the database. Create an admin user first via: pnpm medusa user -e you@example.com -p password',
    );
    process.exit(1);
  }

  const user = users[0];
  logger.info(`Assigning superadmin role to: ${user.email} (${user.id})`);

  await updateUserRoleWorkflow(container).run({
    input: { userId: user.id, role: 'superadmin' },
  });

  logger.info(`✅ Done — ${user.email} is now superadmin.`);
  logger.info('Log in and open Settings → Team to assign roles to other users.');
}
