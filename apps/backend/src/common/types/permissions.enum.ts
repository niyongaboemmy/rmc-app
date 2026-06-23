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

  // ── System ────────────────────────────────────────────────────────
  SYSTEM_SETTINGS = 'system:settings',
  AUDIT_LOG_VIEW = 'audit_log:view',
}

export const ALL_PERMISSIONS = Object.values(Permission);
