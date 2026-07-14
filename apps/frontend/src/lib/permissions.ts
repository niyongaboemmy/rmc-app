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

  DONATIONS_VIEW = 'donations:view',
  DONATIONS_MANAGE = 'donations:manage',

  SCHOOLS_VIEW = 'schools:view',
  SCHOOLS_MANAGE = 'schools:manage',

  FUNERAL_VIEW = 'funeral:view',
  FUNERAL_MANAGE = 'funeral:manage',

  HAJJ_VIEW = 'hajj:view',
  HAJJ_MANAGE = 'hajj:manage',
  HAJJ_APPROVE = 'hajj:approve',

  CONTACT_MESSAGES_VIEW = 'contact_messages:view',
  CONTACT_MESSAGES_MANAGE = 'contact_messages:manage',

  REPORTS_VIEW = 'reports:view',
  REPORTS_EXPORT = 'reports:export',

  MARRIAGE_VIEW = 'marriage:view',
  MARRIAGE_MANAGE = 'marriage:manage',
  MARRIAGE_APPROVE = 'marriage:approve',
  MARRIAGE_ASSIGN_IMAM = 'marriage:assign_imam',
  MARRIAGE_CERTIFICATE = 'marriage:certificate',
  MARRIAGE_REPORTS = 'marriage:reports',

  GOOD_CONDUCT_VIEW = 'good_conduct:view',
  GOOD_CONDUCT_MANAGE = 'good_conduct:manage',
  GOOD_CONDUCT_APPROVE = 'good_conduct:approve',
  GOOD_CONDUCT_CERTIFICATE = 'good_conduct:certificate',
  GOOD_CONDUCT_REPORTS = 'good_conduct:reports',

  JOB_APPLICATIONS_VIEW = 'job_applications:view',
  JOB_APPLICATIONS_MANAGE = 'job_applications:manage',

  SYSTEM_SETTINGS = 'system:settings',
  AUDIT_LOG_VIEW = 'audit_log:view',

  // ── SMS Configuration ─────────────────────────────────────────
  SMS_CONFIG_VIEW = 'sms_config:view',
  SMS_CONFIG_MANAGE = 'sms_config:manage',

  NOTIFICATION_SETTINGS_VIEW = 'notification_settings:view',
  NOTIFICATION_SETTINGS_MANAGE = 'notification_settings:manage',

  // ── AI Assistant ──────────────────────────────────────────────
  AI_SETTINGS_VIEW = 'ai_settings:view',
  AI_SETTINGS_MANAGE = 'ai_settings:manage',

  // ── Payment Settings ──────────────────────────────────────────
  PAYMENT_SETTINGS_VIEW = 'payment_settings:view',
  PAYMENT_SETTINGS_MANAGE = 'payment_settings:manage',

  SUBSCRIBERS_VIEW = 'subscribers:view',
  SUBSCRIBERS_MANAGE = 'subscribers:manage',

  DRIVE_VIEW = 'drive:view',
  DRIVE_CREATE = 'drive:create',
  DRIVE_EDIT = 'drive:edit',
  DRIVE_DELETE = 'drive:delete',
  DRIVE_SHARE = 'drive:share',
  DRIVE_ADMIN = 'drive:admin',

  UPLOAD_SETTINGS_VIEW = 'upload_settings:view',
  UPLOAD_SETTINGS_MANAGE = 'upload_settings:manage',

  USERS_VIEW_DRIVE = 'users:view_drive',
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
