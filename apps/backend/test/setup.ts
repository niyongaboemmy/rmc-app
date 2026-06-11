import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.test' });

const TEST_DATABASE_URL =
  process.env.DATABASE_URL || 'postgresql://rmc_user:password@localhost:5432/rmc_test_db';

async function waitForPostgres(dataSource: DataSource, retries = 30): Promise<void> {
  for (let i = 0; i < retries; i++) {
    try {
      await dataSource.initialize();
      return;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }
  throw new Error('PostgreSQL not ready after 30 seconds');
}

module.exports = async (): Promise<void> => {
  const dataSource = new DataSource({
    type: 'postgres',
    url: TEST_DATABASE_URL,
    entities: [__dirname + '/../src/**/*.entity.{js,ts}'],
    migrations: [__dirname + '/../src/database/migrations/*.{js,ts}'],
    synchronize: false,
  });

  await waitForPostgres(dataSource);

  // Run migrations
  await dataSource.runMigrations();

  // Clear all tables in dependency order
  await dataSource.query(`
    TRUNCATE TABLE
      ai_messages, ai_chat_sessions, knowledge_base_entries,
      student_enrollments, school_classes, schools,
      audit_log, expense_records, income_records,
      notifications, announcements,
      event_registrations, events,
      transactions, orphan_profiles, donations, donation_campaigns,
      service_documents, service_applications,
      member_profiles,
      phone_otp_verifications, password_reset_tokens, refresh_tokens,
      mosque_imams, users
    RESTART IDENTITY CASCADE
  `);

  await dataSource.destroy();

  // Store the DB URL for tests
  process.env.DATABASE_URL = TEST_DATABASE_URL;
};
