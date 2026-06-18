import 'reflect-metadata';
import * as dotenv from 'dotenv';
dotenv.config();

import * as bcrypt from 'bcrypt';
import { AppDataSource } from '../../config/data-source';

const EMAIL = 'tuyishimireericc@gmail.com';
const PASSWORD = '12345678';
const PHONE = process.env.NEW_ADMIN_PHONE || '+250788000001';

async function run(): Promise<void> {
  await AppDataSource.initialize();
  console.log('[create-superadmin] Database connected.');

  const roleRepo = AppDataSource.getRepository('roles');
  const userRepo = AppDataSource.getRepository('users');

  const superadminRole = await roleRepo.findOne({ where: { slug: 'superadmin' } });
  if (!superadminRole) {
    throw new Error(
      'Super Admin role (slug: superadmin) not found. Run `npm run seed` first to seed roles.',
    );
  }

  const passwordHash = await bcrypt.hash(PASSWORD, 12);
  const existing = await userRepo.findOne({ where: { email: EMAIL } });

  if (existing) {
    await userRepo.update(existing.id, {
      passwordHash,
      role: 'superadmin',
      roleId: superadminRole.id,
      status: 'active',
      isEmailVerified: true,
      isPhoneVerified: true,
    });
    console.log(
      `[create-superadmin] Existing user "${EMAIL}" promoted to Super Admin and password reset.`,
    );
  } else {
    await userRepo.save(
      userRepo.create({
        email: EMAIL,
        phone: PHONE,
        passwordHash,
        firstName: 'Tuyishimire',
        lastName: 'Eric',
        role: 'superadmin',
        roleId: superadminRole.id,
        status: 'active',
        isEmailVerified: true,
        isPhoneVerified: true,
      }),
    );
    console.log(`[create-superadmin] Created Super Admin user: ${EMAIL}`);
  }

  await AppDataSource.destroy();
  console.log('[create-superadmin] Done.');
}

run().catch((err) => {
  console.error('[create-superadmin] Error:', err);
  process.exit(1);
});
