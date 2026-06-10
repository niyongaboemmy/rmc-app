export enum Permission {
  USERS_VIEW = 'users:view',
  USERS_CREATE = 'users:create',
  USERS_EDIT = 'users:edit',
  USERS_DELETE = 'users:delete',
  USERS_ASSIGN_ROLE = 'users:assign_role',

  ROLES_VIEW = 'roles:view',
  ROLES_CREATE = 'roles:create',
  ROLES_EDIT = 'roles:edit',
  ROLES_DELETE = 'roles:delete',

  MEMBERS_VIEW = 'members:view',
  MEMBERS_CREATE = 'members:create',
  MEMBERS_EDIT = 'members:edit',
  MEMBERS_DELETE = 'members:delete',
  MEMBERS_APPROVE = 'members:approve',
  MEMBERS_ID_CARD = 'members:id_card',

  MOSQUES_VIEW = 'mosques:view',
  MOSQUES_CREATE = 'mosques:create',
  MOSQUES_EDIT = 'mosques:edit',
  MOSQUES_DELETE = 'mosques:delete',
  MOSQUES_MANAGE_IMAMS = 'mosques:manage_imams',

  PRAYER_TIMES_VIEW = 'prayer_times:view',
  PRAYER_TIMES_MANAGE = 'prayer_times:manage',

  CONTENT_VIEW = 'content:view',
  CONTENT_CREATE = 'content:create',
  CONTENT_EDIT = 'content:edit',
  CONTENT_DELETE = 'content:delete',

  FINANCE_VIEW = 'finance:view',
  FINANCE_MANAGE = 'finance:manage',

  REPORTS_VIEW = 'reports:view',
  REPORTS_EXPORT = 'reports:export',

  SYSTEM_SETTINGS = 'system:settings',
  AUDIT_LOG_VIEW = 'audit_log:view',
}

export function hasPermission(userPermissions: string[], permission: Permission): boolean {
  if (userPermissions.includes('*')) return true;
  return userPermissions.includes(permission);
}

export function hasAnyPermission(userPermissions: string[], permissions: Permission[]): boolean {
  return permissions.some((p) => hasPermission(userPermissions, p));
}

export function hasAllPermissions(userPermissions: string[], permissions: Permission[]): boolean {
  return permissions.every((p) => hasPermission(userPermissions, p));
}
