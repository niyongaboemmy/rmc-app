/**
 * One-off script to create a superadmin user.
 * Usage: npx ts-node src/database/seeds/create-superadmin.ts
 */
import 'dotenv/config';
import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import * as path from 'path';

const dataSource = new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL,
  entities: [path.join(__dirname, '../../**/*.entity{.ts,.js}')],
  synchronize: false,
});

async function main() {
  await dataSource.initialize();

  const roleRepo = dataSource.getRepository('roles');
  const userRepo = dataSource.getRepository('users');

  const email    = 'emmanuelniyongabo44@gmail.com';
  const password = 'Admin@RMC2024!';
  const phone    = '+250788000001';

  const superadminRole = await roleRepo.findOne({ where: { slug: 'superadmin' } });
  if (!superadminRole) {
    console.error('Superadmin role not found — run the main seed first.');
    process.exit(1);
  }

  const existing = await userRepo.findOne({ where: { email } });
  if (existing) {
    console.log(`User ${email} already exists.`);
    await dataSource.destroy();
    return;
  }

  const passwordHash = await bcrypt.hash(password, 12);
  await userRepo.save(
    userRepo.create({
      email,
      phone,
      passwordHash,
      firstName: 'Emmanuel',
      lastName:  'Niyongabo',
      role:      'superadmin',
      roleId:    superadminRole.id,
      status:    'active',
      isEmailVerified:  true,
      isPhoneVerified:  true,
    }),
  );

  console.log(`✅ Superadmin created: ${email} | password: ${password}`);
  await dataSource.destroy();
}

main().catch((err) => { console.error(err); process.exit(1); });
