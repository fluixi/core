/**
 * updateUserRoleWorkflow — stores a user's admin role in metadata.role.
 *
 * Medusa's User module has no built-in role field beyond the basic actor
 * type, so we persist granular roles (superadmin | admin | support | viewer)
 * in user.metadata.  The step is compensatable: if any downstream step fails,
 * the previous metadata is restored.
 *
 * Usage:
 *   const { result } = await updateUserRoleWorkflow(req.scope).run({
 *     input: { userId: 'usr_01...', role: 'support' },
 *   });
 */

import {
  createStep,
  createWorkflow,
  StepResponse,
  WorkflowResponse,
} from '@medusajs/framework/workflows-sdk';
import { Modules } from '@medusajs/framework/utils';

export type AdminRole = 'superadmin' | 'admin' | 'support' | 'viewer';

export type UpdateUserRoleInput = {
  userId: string;
  role: AdminRole;
};

type StepCompensation = {
  userId: string;
  prevMetadata: Record<string, unknown>;
};

const updateUserRoleStep = createStep<UpdateUserRoleInput, { userId: string; role: AdminRole }, StepCompensation>(
  'update-user-role-step',
  async (input, { container }) => {
    const userModule = container.resolve(Modules.USER);

    const [existing] = await userModule.listUsers({ id: [input.userId] });
    if (!existing) throw new Error(`User ${input.userId} not found`);

    const prevMetadata = (existing.metadata as Record<string, unknown>) ?? {};

    await userModule.updateUsers([{
      id: input.userId,
      metadata: {
        ...prevMetadata,
        role: input.role,
      },
    }]);

    return new StepResponse(
      { userId: input.userId, role: input.role },
      { userId: input.userId, prevMetadata },
    );
  },
  async (compensate, { container }) => {
    if (!compensate) return;
    const userModule = container.resolve(Modules.USER);
    await userModule.updateUsers([{
      id: compensate.userId,
      metadata: compensate.prevMetadata,
    }]);
  },
);

export const updateUserRoleWorkflow = createWorkflow(
  'update-user-role',
  (input: UpdateUserRoleInput) => {
    const result = updateUserRoleStep(input);
    return new WorkflowResponse(result);
  },
);
