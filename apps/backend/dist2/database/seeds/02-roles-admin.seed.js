"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.seedRolesAndAdmin = seedRolesAndAdmin;
const bcrypt = require("bcrypt");
const permissions_enum_1 = require("../../common/types/permissions.enum");
const OPERATOR_PERMISSIONS = [
    permissions_enum_1.Permission.MEMBERS_VIEW,
    permissions_enum_1.Permission.MEMBERS_CREATE,
    permissions_enum_1.Permission.MEMBERS_EDIT,
    permissions_enum_1.Permission.MEMBERS_APPROVE,
    permissions_enum_1.Permission.MEMBERS_ID_CARD,
    permissions_enum_1.Permission.MOSQUES_VIEW,
    permissions_enum_1.Permission.PRAYER_TIMES_VIEW,
    permissions_enum_1.Permission.CONTENT_VIEW,
    permissions_enum_1.Permission.CONTENT_CREATE,
    permissions_enum_1.Permission.CONTENT_EDIT,
    permissions_enum_1.Permission.REPORTS_VIEW,
];
const ADMIN_PERMISSIONS = [
    ...OPERATOR_PERMISSIONS,
    permissions_enum_1.Permission.MEMBERS_DELETE,
    permissions_enum_1.Permission.MOSQUES_CREATE,
    permissions_enum_1.Permission.MOSQUES_EDIT,
    permissions_enum_1.Permission.MOSQUES_MANAGE_IMAMS,
    permissions_enum_1.Permission.PRAYER_TIMES_MANAGE,
    permissions_enum_1.Permission.CONTENT_DELETE,
    permissions_enum_1.Permission.FINANCE_VIEW,
    permissions_enum_1.Permission.REPORTS_EXPORT,
    permissions_enum_1.Permission.USERS_VIEW,
    permissions_enum_1.Permission.USERS_CREATE,
    permissions_enum_1.Permission.USERS_EDIT,
    permissions_enum_1.Permission.USERS_ASSIGN_ROLE,
    permissions_enum_1.Permission.ROLES_VIEW,
    permissions_enum_1.Permission.AUDIT_LOG_VIEW,
];
const DEFAULT_ROLES = [
    {
        name: 'Super Admin',
        slug: 'superadmin',
        description: 'Full system access — cannot be deleted',
        permissions: permissions_enum_1.ALL_PERMISSIONS,
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
        name: 'Member',
        slug: 'user',
        description: 'Standard registered member',
        permissions: [permissions_enum_1.Permission.PRAYER_TIMES_VIEW, permissions_enum_1.Permission.CONTENT_VIEW],
        isSystem: true,
    },
];
async function seedRolesAndAdmin(dataSource) {
    const roleRepo = dataSource.getRepository('roles');
    const userRepo = dataSource.getRepository('users');
    console.log('[SEED] Seeding default roles...');
    const roleMap = {};
    for (const roleData of DEFAULT_ROLES) {
        const existing = await roleRepo.findOne({ where: { slug: roleData.slug } });
        if (existing) {
            await roleRepo.update(existing.id, { permissions: roleData.permissions });
            roleMap[roleData.slug] = existing.id;
            console.log(`  [SEED] Role "${roleData.name}" already exists — permissions refreshed`);
        }
        else {
            const saved = await roleRepo.save(roleRepo.create(roleData));
            roleMap[roleData.slug] = saved.id;
            console.log(`  [SEED] Created role "${roleData.name}"`);
        }
    }
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@rmc.org.rw';
    const adminPassword = process.env.ADMIN_PASSWORD || 'Admin@RMC2024!';
    const adminPhone = process.env.ADMIN_PHONE || '+250788000000';
    const existing = await userRepo.findOne({ where: { email: adminEmail } });
    if (!existing) {
        const passwordHash = await bcrypt.hash(adminPassword, 12);
        const superadminRoleId = roleMap['superadmin'];
        await userRepo.save(userRepo.create({
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
        }));
        console.log(`  [SEED] Created superadmin user: ${adminEmail} | password: ${adminPassword}`);
    }
    else {
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
//# sourceMappingURL=02-roles-admin.seed.js.map