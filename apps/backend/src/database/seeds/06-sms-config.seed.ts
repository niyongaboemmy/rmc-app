import { DataSource } from 'typeorm';
import { encryptCredential } from '../../integrations/sms/sms-crypto.util';

const INTOUCH_USERNAME = process.env.INTOUCH_USERNAME || 'RMC';
const INTOUCH_PASSWORD = process.env.INTOUCH_PASSWORD || 'rmc@123';
const INTOUCH_SENDER = process.env.INTOUCH_SENDER || 'RMC';
const APP_URL = process.env.APP_URL || 'http://localhost:3000';
const INTOUCH_DLR_URL = process.env.INTOUCH_DLR_URL || `${APP_URL}/api/v1/webhooks/sms-delivery`;

export async function seedSmsConfig(dataSource: DataSource): Promise<void> {
  const encKey =
    process.env.APP_ENCRYPTION_KEY ||
    process.env.JWT_ACCESS_SECRET ||
    'rmc-fallback-key-change-in-prod';

  const passwordEnc = encryptCredential(INTOUCH_PASSWORD, encKey);

  const existing = await dataSource.query(`SELECT id FROM sms_config LIMIT 1`);

  if (existing.length > 0) {
    await dataSource.query(
      `UPDATE sms_config
       SET username     = $1,
           password_enc = $2,
           sender_name  = $3,
           dlr_url      = $4,
           is_active    = true,
           updated_at   = now()`,
      [INTOUCH_USERNAME, passwordEnc, INTOUCH_SENDER, INTOUCH_DLR_URL],
    );
  } else {
    await dataSource.query(
      `INSERT INTO sms_config (username, password_enc, sender_name, dlr_url, is_active)
       VALUES ($1, $2, $3, $4, true)`,
      [INTOUCH_USERNAME, passwordEnc, INTOUCH_SENDER, INTOUCH_DLR_URL],
    );
  }

  // eslint-disable-next-line no-console
  console.log(
    `[Seed] SMS config — username="${INTOUCH_USERNAME}", sender="${INTOUCH_SENDER}", active=true`,
  );
}
