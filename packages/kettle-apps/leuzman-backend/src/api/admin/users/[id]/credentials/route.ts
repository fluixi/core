/**
 * PATCH /admin/users/:id/credentials
 *
 * Updates a user's email and/or password.
 * Only superadmins may call this endpoint.
 *
 * Body: { email?, password?, first_name?, last_name? }
 * Returns: { user }
 */

import type { MedusaRequest, MedusaResponse } from '@medusajs/framework/http';
import { authenticate } from '@medusajs/framework/http';
import { Modules } from '@medusajs/framework/utils';
import bcrypt from 'bcrypt';

async function handler(req: MedusaRequest, res: MedusaResponse) {
  const { id: userId } = req.params as { id: string };
  const { email, password, first_name, last_name } = req.body as {
    email?: string;
    password?: string;
    first_name?: string;
    last_name?: string;
  };

  if (!email?.trim() && !password && first_name === undefined && last_name === undefined) {
    return res.status(400).json({ message: 'At least one field (email, password, first_name, last_name) is required.' });
  }

  const callerId = (req as any).auth_context?.actor_id as string | undefined;
  if (!callerId) return res.status(401).json({ message: 'Unauthorized' });

  const userModule = req.scope.resolve(Modules.USER);
  const authModule = req.scope.resolve(Modules.AUTH);

  const [caller] = await userModule.listUsers({ id: [callerId] });
  if ((caller?.metadata as any)?.role !== 'superadmin') {
    return res.status(403).json({ message: 'Only superadmins can update user credentials.' });
  }

  const [target] = await userModule.listUsers({ id: [userId] });
  if (!target) return res.status(404).json({ message: 'User not found.' });

  const normalizedEmail = email?.trim().toLowerCase();

  // Reject duplicate emails when changing email
  if (normalizedEmail && normalizedEmail !== target.email) {
    const existing = await userModule.listUsers({ email: [normalizedEmail] });
    if (existing.length > 0) {
      return res.status(409).json({ message: `A user with email "${normalizedEmail}" already exists.` });
    }
  }

  // Update user record (name and/or email)
  const userUpdates: Record<string, string> = {};
  if (normalizedEmail && normalizedEmail !== target.email) userUpdates.email = normalizedEmail;
  if (first_name !== undefined) userUpdates.first_name = first_name.trim();
  if (last_name !== undefined) userUpdates.last_name = last_name.trim();

  let updatedUser = target;
  if (Object.keys(userUpdates).length > 0) {
    [updatedUser] = await userModule.updateUsers([{ id: userId, ...userUpdates }]);
  }

  // Find the emailpass provider identity for this user (keyed by current email)
  if (normalizedEmail || password) {
    const identities = await (authModule as any).listAuthIdentities({
      provider_identities: { provider: 'emailpass', entity_id: target.email },
    });

    if (identities?.length > 0) {
      const identity = identities[0];
      const identityUpdate: Record<string, any> = {};

      if (normalizedEmail && normalizedEmail !== target.email) {
        identityUpdate.entity_id = normalizedEmail;
      }

      if (password) {
        const passwordHash = await bcrypt.hash(password, 10);
        identityUpdate.provider_metadata = {
          ...(identity.provider_identities?.[0]?.provider_metadata ?? {}),
          password: passwordHash,
        };
      }

      if (Object.keys(identityUpdate).length > 0) {
        await (authModule as any).updateAuthIdentity(identity.id, {
          provider_identities: [{ id: identity.provider_identities?.[0]?.id, ...identityUpdate }],
        });
      }
    }
  }

  return res.json({ user: updatedUser });
}

export const PATCH = [authenticate('user', ['bearer', 'session']), handler] as any;
