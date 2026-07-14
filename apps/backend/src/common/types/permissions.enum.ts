export enum Permission {
  // ── Users ─────────────────────────────────────────────────────────
  USERS_VIEW = 'users:view',
  USERS_CREATE = 'users:create',
  USERS_EDIT = 'users:edit',
  USERS_DELETE = 'users:delete',
  USERS_ASSIGN_ROLE = 'users:assign_role',

  // ── Roles ─────────────────────────────────────────────────────────
  ROLES_VIEW = 'roles:view',
  ROLES_CREATE = 'roles:create',
  ROLES_EDIT = 'roles:edit',
  ROLES_DELETE = 'roles:delete',

  // ── Members ───────────────────────────────────────────────────────
  MEMBERS_VIEW = 'members:view',
  MEMBERS_CREATE = 'members:create',
  MEMBERS_EDIT = 'members:edit',
  MEMBERS_DELETE = 'members:delete',
  MEMBERS_APPROVE = 'members:approve',
  MEMBERS_ID_CARD = 'members:id_card',

  // ── Mosques ───────────────────────────────────────────────────────
  MOSQUES_VIEW = 'mosques:view',
  MOSQUES_CREATE = 'mosques:create',
  MOSQUES_EDIT = 'mosques:edit',
  MOSQUES_DELETE = 'mosques:delete',
  MOSQUES_MANAGE_IMAMS = 'mosques:manage_imams',

  // ── Prayer Times ──────────────────────────────────────────────────
  PRAYER_TIMES_VIEW = 'prayer_times:view',
  PRAYER_TIMES_MANAGE = 'prayer_times:manage',

  // ── Content (blog, announcements, gallery, verse) ─────────────────
  CONTENT_VIEW = 'content:view',
  CONTENT_CREATE = 'content:create',
  CONTENT_EDIT = 'content:edit',
  CONTENT_DELETE = 'content:delete',

  // ── Finance ───────────────────────────────────────────────────────
  FINANCE_VIEW = 'finance:view',
  FINANCE_MANAGE = 'finance:manage',

  // ── Donations ─────────────────────────────────────────────────────
  DONATIONS_VIEW = 'donations:view',
  DONATIONS_MANAGE = 'donations:manage',

  // ── Schools ───────────────────────────────────────────────────────
  SCHOOLS_VIEW = 'schools:view',
  SCHOOLS_MANAGE = 'schools:manage',

  // ── Contact messages (inbox) ──────────────────────────────────────
  CONTACT_MESSAGES_VIEW = 'contact_messages:view',
  CONTACT_MESSAGES_MANAGE = 'contact_messages:manage',

  // ── Reports ───────────────────────────────────────────────────────
  REPORTS_VIEW = 'reports:view',
  REPORTS_EXPORT = 'reports:export',

  // ── Marriage Service ──────────────────────────────────────────────
  MARRIAGE_VIEW = 'marriage:view',
  MARRIAGE_MANAGE = 'marriage:manage',
  MARRIAGE_APPROVE = 'marriage:approve',
  MARRIAGE_ASSIGN_IMAM = 'marriage:assign_imam',
  MARRIAGE_CERTIFICATE = 'marriage:certificate',
  MARRIAGE_REPORTS = 'marriage:reports',

  // ── Good Conduct Service ──────────────────────────────────────────
  GOOD_CONDUCT_VIEW = 'good_conduct:view',
  GOOD_CONDUCT_MANAGE = 'good_conduct:manage',
  GOOD_CONDUCT_APPROVE = 'good_conduct:approve',
  GOOD_CONDUCT_CERTIFICATE = 'good_conduct:certificate',
  GOOD_CONDUCT_REPORTS = 'good_conduct:reports',

  // ── Job Applications Service ──────────────────────────────────────
  JOB_APPLICATIONS_VIEW = 'job_applications:view',
  JOB_APPLICATIONS_MANAGE = 'job_applications:manage',

  // ── Funeral Service ───────────────────────────────────────────────
  FUNERAL_VIEW = 'funeral:view',
  FUNERAL_MANAGE = 'funeral:manage',

  // ── Hajj Service ──────────────────────────────────────────────────
  HAJJ_VIEW = 'hajj:view',
  HAJJ_MANAGE = 'hajj:manage',
  HAJJ_APPROVE = 'hajj:approve',

  // ── System ────────────────────────────────────────────────────────
  SYSTEM_SETTINGS = 'system:settings',
  AUDIT_LOG_VIEW = 'audit_log:view',

  // ── SMS Configuration ─────────────────────────────────────────────
  SMS_CONFIG_VIEW = 'sms_config:view',
  SMS_CONFIG_MANAGE = 'sms_config:manage',

  // ── Notification Settings ─────────────────────────────────────────
  NOTIFICATION_SETTINGS_VIEW = 'notification_settings:view',
  NOTIFICATION_SETTINGS_MANAGE = 'notification_settings:manage',

  // ── AI Assistant Settings ─────────────────────────────────────────
  AI_SETTINGS_VIEW = 'ai_settings:view',
  AI_SETTINGS_MANAGE = 'ai_settings:manage',

  // ── Payment Settings ──────────────────────────────────────────────
  PAYMENT_SETTINGS_VIEW = 'payment_settings:view',
  PAYMENT_SETTINGS_MANAGE = 'payment_settings:manage',

  // ── Subscribers / Newsletter ──────────────────────────────────────
  SUBSCRIBERS_VIEW = 'subscribers:view',
  SUBSCRIBERS_MANAGE = 'subscribers:manage',

  // ── Drive (File Manager) ──────────────────────────────────────────────────
  DRIVE_VIEW = 'drive:view',
  DRIVE_CREATE = 'drive:create',
  DRIVE_EDIT = 'drive:edit',
  DRIVE_DELETE = 'drive:delete',
  DRIVE_SHARE = 'drive:share',
  DRIVE_ADMIN = 'drive:admin',

  // ── Upload Settings ────────────────────────────────────────────────
  UPLOAD_SETTINGS_VIEW = 'upload_settings:view',
  UPLOAD_SETTINGS_MANAGE = 'upload_settings:manage',

  // ── User Drive (admin view of any user's drive) ────────────────────
  USERS_VIEW_DRIVE = 'users:view_drive',
}

export const ALL_PERMISSIONS = Object.values(Permission);
