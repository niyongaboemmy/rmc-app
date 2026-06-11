import { DataSource } from 'typeorm';

module.exports = async (): Promise<void> => {
  const dataSource = new DataSource({
    type: 'postgres',
    url: process.env.DATABASE_URL,
    entities: [__dirname + '/../src/**/*.entity.{js,ts}'],
    synchronize: false,
  });

  try {
    await dataSource.initialize();
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
  } catch {
    // teardown best-effort
  }
};
