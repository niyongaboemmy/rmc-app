import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { Permission, ALL_PERMISSIONS } from '../../common/types/permissions.enum';

const OPERATOR_PERMISSIONS: Permission[] = [
  Permission.MEMBERS_VIEW,
  Permission.MEMBERS_CREATE,
  Permission.MEMBERS_EDIT,
  Permission.MEMBERS_APPROVE,
  Permission.MEMBERS_ID_CARD,
  Permission.MOSQUES_VIEW,
  Permission.PRAYER_TIMES_VIEW,
  Permission.CONTENT_VIEW,
  Permission.CONTENT_CREATE,
  Permission.CONTENT_EDIT,
  Permission.REPORTS_VIEW,
];

const ADMIN_PERMISSIONS: Permission[] = [
  ...OPERATOR_PERMISSIONS,
  Permission.MEMBERS_DELETE,
  Permission.MOSQUES_CREATE,
  Permission.MOSQUES_EDIT,
  Permission.MOSQUES_MANAGE_IMAMS,
  Permission.PRAYER_TIMES_MANAGE,
  Permission.CONTENT_DELETE,
  Permission.FINANCE_VIEW,
  Permission.DONATIONS_VIEW,
  Permission.DONATIONS_MANAGE,
  Permission.SCHOOLS_VIEW,
  Permission.SCHOOLS_MANAGE,
  Permission.CONTACT_MESSAGES_VIEW,
  Permission.CONTACT_MESSAGES_MANAGE,
  Permission.REPORTS_EXPORT,
  Permission.USERS_VIEW,
  Permission.USERS_CREATE,
  Permission.USERS_EDIT,
  Permission.USERS_ASSIGN_ROLE,
  Permission.ROLES_VIEW,
  Permission.AUDIT_LOG_VIEW,
];

const MARRIAGE_OFFICER_PERMISSIONS: Permission[] = [
  Permission.MARRIAGE_VIEW,
  Permission.MARRIAGE_MANAGE,
  Permission.MARRIAGE_APPROVE,
  Permission.MARRIAGE_ASSIGN_IMAM,
  Permission.MARRIAGE_CERTIFICATE,
  Permission.MARRIAGE_REPORTS,
  Permission.MEMBERS_VIEW,
  Permission.MOSQUES_VIEW,
  Permission.CONTENT_VIEW,
];

const GOOD_CONDUCT_REVIEWER_PERMISSIONS: Permission[] = [
  Permission.GOOD_CONDUCT_VIEW,
  Permission.GOOD_CONDUCT_APPROVE,
  Permission.GOOD_CONDUCT_CERTIFICATE,
  Permission.MEMBERS_VIEW,
  Permission.MOSQUES_VIEW,
];

const GOOD_CONDUCT_OFFICER_PERMISSIONS: Permission[] = [
  Permission.GOOD_CONDUCT_VIEW,
  Permission.GOOD_CONDUCT_MANAGE,
  Permission.MEMBERS_VIEW,
  Permission.MOSQUES_VIEW,
];

const DEFAULT_ROLES = [
  {
    name: 'Super Admin',
    slug: 'superadmin',
    description: 'Full system access — cannot be deleted',
    permissions: ALL_PERMISSIONS,
    isSystem: true,
  },
  {
    name: 'Admin',
    slug: 'admin',
    description: 'Administrative access without system settings',
    permissions: ADMIN_PERMISSIONS,
    isSystem: true,
  },
  {
    name: 'Operator',
    slug: 'operator',
    description: 'Day-to-day operations: members, content, prayer times',
    permissions: OPERATOR_PERMISSIONS,
    isSystem: true,
  },
  {
    name: 'Marriage Officer',
    slug: 'marriage_officer',
    description: 'Manages marriage applications, scheduling, and certificates',
    permissions: MARRIAGE_OFFICER_PERMISSIONS,
    isSystem: false,
  },
  {
    name: 'Good Conduct Reviewer',
    slug: 'good_conduct_reviewer',
    description: 'Reviews and approves Good Conduct certificate requests',
    permissions: GOOD_CONDUCT_REVIEWER_PERMISSIONS,
    isSystem: false,
  },
  {
    name: 'Good Conduct Officer',
    slug: 'good_conduct_officer',
    description: 'Processes Good Conduct requests: payment confirmation, imam assignment',
    permissions: GOOD_CONDUCT_OFFICER_PERMISSIONS,
    isSystem: false,
  },
  {
    name: 'Member',
    slug: 'user',
    description: 'Standard registered member',
    permissions: [Permission.PRAYER_TIMES_VIEW, Permission.CONTENT_VIEW],
    isSystem: true,
  },
];

export async function seedRolesAndAdmin(dataSource: DataSource): Promise<void> {
  const roleRepo = dataSource.getRepository('roles');
  const userRepo = dataSource.getRepository('users');

  console.log('[SEED] Seeding default roles...');

  const roleMap: Record<string, string> = {};

  for (const roleData of DEFAULT_ROLES) {
    const existing = await roleRepo.findOne({ where: { slug: roleData.slug } });
    if (existing) {
      // Update permissions in case the enum grew
      await roleRepo.update(existing.id, { permissions: roleData.permissions });
      roleMap[roleData.slug] = existing.id;
      console.log(`  [SEED] Role "${roleData.name}" already exists — permissions refreshed`);
    } else {
      const saved = await roleRepo.save(roleRepo.create(roleData));
      roleMap[roleData.slug] = saved.id;
      console.log(`  [SEED] Created role "${roleData.name}"`);
    }
  }

  // ── Seed superadmin user ────────────────────────────────────────────────────
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@rmc.org.rw';
  const adminPassword = process.env.ADMIN_PASSWORD || 'Admin@RMC2024!';
  const adminPhone = process.env.ADMIN_PHONE || '+250788000000';

  const existing = await userRepo.findOne({ where: { email: adminEmail } });
  if (!existing) {
    const passwordHash = await bcrypt.hash(adminPassword, 12);
    const superadminRoleId = roleMap['superadmin'];

    await userRepo.save(
      userRepo.create({
        email: adminEmail,
        phone: adminPhone,
        passwordHash,
        firstName: 'Super',
        lastName: 'Admin',
        role: 'superadmin',
        roleId: superadminRoleId,
        status: 'active',
        isEmailVerified: true,
        isPhoneVerified: true,
      }),
    );
    console.log(`  [SEED] Created superadmin user: ${adminEmail} | password: ${adminPassword}`);
  } else {
    // Ensure superadmin always has the correct role_id
    if (!existing.roleId && roleMap['superadmin']) {
      await userRepo.update(existing.id, {
        role: 'superadmin',
        roleId: roleMap['superadmin'],
      });
    }
    console.log(`  [SEED] Superadmin user already exists: ${adminEmail}`);
  }

  console.log('[SEED] Roles and admin seed complete.');
}
