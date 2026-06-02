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
export declare const PATCH: any;
