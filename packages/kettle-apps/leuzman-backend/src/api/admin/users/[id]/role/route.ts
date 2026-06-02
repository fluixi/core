/**
 * PATCH /admin/users/:id/role
 *
 * Assigns one of the application-level roles (superadmin | admin | support | viewer)
 * to a Medusa user by writing it into metadata.role.
 *
 * Authorization: caller must be authenticated AND have metadata.role === 'superadmin'.
 *
 * Body: { role: 'superadmin' | 'admin' | 'support' | 'viewer' }
 *
 * Returns: { userId, role }
 */

import type { MedusaRequest, MedusaResponse } from '@medusajs/framework/http';
import { authenticate } from '@medusajs/framework/http';
import { Modules } from '@medusajs/framework/utils';
import { updateUserRoleWorkflow, type AdminRole } from '../../../../../workflows/update-user-role';

const VALID_ROLES: AdminRole[] = ['superadmin', 'admin', 'support', 'viewer'];

async function handler(req: MedusaRequest, res: MedusaResponse) {
  const { id: userId } = req.params as { id: string };
  const { role } = req.body as { role: AdminRole };

  if (!VALID_ROLES.includes(role)) {
    return res.status(400).json({
      message: `Invalid role. Must be one of: ${VALID_ROLES.join(', ')}`,
    });
  }

  // Resolve caller from auth context and check superadmin privilege
  const callerId = (req as any).auth_context?.actor_id as string | undefined;
  if (!callerId) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  const userModule = req.scope.resolve(Modules.USER);
  const [caller] = await userModule.listUsers({ id: [callerId] });
  const callerRole = (caller?.metadata as Record<string, unknown> | undefined)?.role;

  if (callerRole !== 'superadmin') {
    return res.status(403).json({ message: 'Only superadmins can assign roles.' });
  }

  const { result } = await updateUserRoleWorkflow(req.scope).run({
    input: { userId, role },
  });

  res.json(result);
}

export const PATCH = [
  authenticate('user', ['bearer', 'session']),
  handler,
] as any;
