export const ADMIN_ROLES = ['superuser', 'admin', 'moderator', 'viewer'] as const;
export type AdminRole = typeof ADMIN_ROLES[number];

export const ROLE_LABELS: Record<AdminRole, string> = {
  superuser: 'Superuser',
  admin:     'Admin',
  moderator: 'Moderator',
  viewer:    'Viewer',
};

export const ROLE_COLORS: Record<AdminRole, string> = {
  superuser: 'danger',
  admin:     'brand',
  moderator: 'warning',
  viewer:    'neutral',
};

export interface AdminUser {
  uid:                   string;
  email:                 string;
  display_name?:         string;
  role:                  AdminRole;
  custom_permissions:    string[];
  effective_permissions: string[];
  is_active:             boolean;
  created_by?:           string;
  createdAt?:            string;
  updatedAt?:            string;
}

export interface CreateAdminUserDto {
  email:               string;
  role:                AdminRole;
  display_name?:       string;
  custom_permissions?: string[];
}

export interface PermissionsMap {
  roles:       AdminRole[];
  permissions: Record<AdminRole, string[]>;
}
