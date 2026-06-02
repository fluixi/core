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
export type AdminRole = 'superadmin' | 'admin' | 'support' | 'viewer';
export type UpdateUserRoleInput = {
    userId: string;
    role: AdminRole;
};
export declare const updateUserRoleWorkflow: import("@medusajs/framework/workflows-sdk").ReturnWorkflow<UpdateUserRoleInput, {
    userId: string;
    role: AdminRole;
}, []>;
