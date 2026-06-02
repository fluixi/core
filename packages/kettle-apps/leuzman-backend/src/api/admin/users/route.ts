/**
 * POST /admin/users
 *
 * Creates a Medusa user with email+password credentials directly,
 * without going through the invite flow.
 *
 * Authorization: caller must be authenticated AND have metadata.role === 'superadmin'.
 *
 * Body: { email, password, first_name?, last_name?, role? }
 * Returns: { user }
 */

import type { MedusaRequest, MedusaResponse } from '@medusajs/framework/http';
import { authenticate } from '@medusajs/framework/http';
import { Modules, ContainerRegistrationKeys } from '@medusajs/framework/utils';
import { updateUserRoleWorkflow, type AdminRole } from '../../../workflows/update-user-role';
import bcrypt from 'bcrypt';

const VALID_ROLES: AdminRole[] = ['superadmin', 'admin', 'support', 'viewer'];

async function handler(req: MedusaRequest, res: MedusaResponse) {
  const { email, password, first_name, last_name, role } = req.body as {
    email: string;
    password: string;
    first_name?: string;
    last_name?: string;
    role?: AdminRole;
  };

  if (!email?.trim() || !password) {
    return res.status(400).json({ message: 'email and password are required.' });
  }

  const callerId = (req as any).auth_context?.actor_id as string | undefined;
  if (!callerId) return res.status(401).json({ message: 'Unauthorized' });

  const userModule  = req.scope.resolve(Modules.USER);
  const authModule  = req.scope.resolve(Modules.AUTH);
  const remoteLink  = req.scope.resolve(ContainerRegistrationKeys.REMOTE_LINK);

  // Only superadmins may create users directly
  const [caller] = await userModule.listUsers({ id: [callerId] });
  if ((caller?.metadata as any)?.role !== 'superadmin') {
    return res.status(403).json({ message: 'Only superadmins can create users directly.' });
  }

  const normalizedEmail = email.trim().toLowerCase();

  // Reject duplicate emails
  const existing = await userModule.listUsers({ email: [normalizedEmail] });
  if (existing.length > 0) {
    return res.status(409).json({ message: `A user with email "${normalizedEmail}" already exists.` });
  }

  // Hash password — Medusa emailpass provider uses bcrypt (10 rounds)
  const passwordHash = await bcrypt.hash(password, 10);

  // Create auth identity with hashed credentials
  const [authIdentity] = await (authModule as any).createAuthIdentity({
    provider_identities: [{
      provider:          'emailpass',
      entity_id:         normalizedEmail,
      provider_metadata: { password: passwordHash },
    }],
  }).then((r: any) => Array.isArray(r) ? r : [r]);

  // Create user record
  const [user] = await userModule.createUsers([{
    email:      normalizedEmail,
    first_name: first_name?.trim() || undefined,
    last_name:  last_name?.trim()  || undefined,
  }]);

  // Link auth identity → user via remote link
  await remoteLink.create([{
    [Modules.AUTH]: { auth_identity_id: authIdentity.id },
    [Modules.USER]: { user_id: user.id },
  }]);

  // Assign application role if provided
  if (role && VALID_ROLES.includes(role)) {
    await updateUserRoleWorkflow(req.scope).run({ input: { userId: user.id, role } });
  }

  return res.status(201).json({ user });
}

export const POST = [authenticate('user', ['bearer', 'session']), handler] as any;
