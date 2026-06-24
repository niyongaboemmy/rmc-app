# SMS Utility — Developer Guide

> **Provider:** InTouch Communications (`intouchsms.co.rw`)  
> **Location:** `apps/backend/src/integrations/sms/`  
> **Exported via:** `IntegrationsModule` (globally available to all feature modules)

---

## Table of Contents

1. [Overview](#1-overview)
2. [File Structure](#2-file-structure)
3. [Initial Setup](#3-initial-setup)
   - [3.1 Environment Variable](#31-environment-variable)
   - [3.2 Run the Migration](#32-run-the-migration)
   - [3.3 Configure Credentials via Admin API](#33-configure-credentials-via-admin-api)
4. [Using SmsService in Code](#4-using-smsservice-in-code)
   - [4.1 Inject the Service](#41-inject-the-service)
   - [4.2 Send a Single SMS (fire-and-forget)](#42-send-a-single-sms-fire-and-forget)
   - [4.3 Send a Single SMS (with result)](#43-send-a-single-sms-with-result)
   - [4.4 Send to Multiple Recipients (bulk)](#44-send-to-multiple-recipients-bulk)
   - [4.5 Custom Sender / DLR URL](#45-custom-sender--dlr-url)
5. [Phone Number Formats](#5-phone-number-formats)
6. [Return Value — SmsSendResult](#6-return-value--smssendresult)
7. [DLR Status Codes](#7-dlr-status-codes)
8. [Admin REST Endpoints](#8-admin-rest-endpoints)
9. [Security — Credential Encryption](#9-security--credential-encryption)
10. [Development / Console Mode](#10-development--console-mode)
11. [Error Handling & Retry](#11-error-handling--retry)
12. [Common Use Cases](#12-common-use-cases)

---

## 1. Overview

The SMS utility is a NestJS service (`SmsService`) that wraps the InTouch Bulk SMS HTTP API. It handles:

- **Phone number normalisation** — accepts any Rwanda format, converts to E.164
- **Single and bulk sends** — one API call for multiple recipients
- **Retry** — one automatic retry on transient network or gateway errors
- **DB-backed configuration** — credentials live in the `sms_config` database table, not in `.env`
- **Password encryption** — the gateway password is stored AES-256-GCM encrypted at rest
- **Balance tracking** — account balance is updated in DB after every successful send
- **Console fallback** — in development (or when unconfigured), SMS bodies are logged to the console instead of calling the real API

---

## 2. File Structure

```
apps/backend/src/integrations/sms/
│
├── sms.types.ts                    — TypeScript interfaces for API request/response and DLR
├── sms-crypto.util.ts              — AES-256-GCM encrypt / decrypt helpers
│
├── entities/
│   └── sms-config.entity.ts        — TypeORM entity mapping the sms_config DB table
│
├── dto/
│   └── update-sms-config.dto.ts    — Validated DTO for the admin update endpoint
│
├── sms-config.service.ts           — Reads/writes sms_config; maintains in-memory cache
├── sms-config-admin.controller.ts  — Admin REST endpoints (SYSTEM_SETTINGS permission)
├── sms.service.ts                  — Public API: send(), sendSms(), sendBulk()
└── sms.module.ts                   — NestJS module wiring

apps/backend/src/database/migrations/
└── 020-sms-config.ts               — Creates sms_config table with a default seeded row
```

---

## 3. Initial Setup

### 3.1 Environment Variable

Add one variable to `.env` (and `.env.example`). This is the **encryption key** used to protect the gateway password stored in the database. The actual InTouch credentials are set through the admin panel — not here.

```env
# Generate with: openssl rand -hex 32
# WARNING: Never change this after first deploy — it will invalidate all encrypted DB values.
APP_ENCRYPTION_KEY=your-64-char-hex-string-here
```

> If `APP_ENCRYPTION_KEY` is not set, the app falls back to `JWT_ACCESS_SECRET`. A warning is logged. Always set a dedicated key in production.

---

### 3.2 Run the Migration

```bash
# From the repo root
npm run migration:run -w apps/backend

# Or directly
cd apps/backend && npx typeorm migration:run -d src/config/data-source.ts
```

This creates the `sms_config` table and seeds one default inactive row (`username = 'RMC'`, `sender_name = 'RMC'`).

---

### 3.3 Configure Credentials via Admin API

After the migration, an admin with the `system:settings` permission must set the InTouch credentials:

```http
PATCH /admin/system/sms-config
Authorization: Bearer <admin-token>
Content-Type: application/json

{
  "username": "RMC",
  "password": "your-intouch-password",
  "senderName": "RMC",
  "dlrUrl": "https://api.rmc.org.rw/webhooks/sms-delivery",
  "isActive": true
}
```

Once saved, SMS sending is live. No restart required — the in-memory cache refreshes automatically.

---

## 4. Using SmsService in Code

### 4.1 Inject the Service

`SmsService` is exported from `SmsModule`, which is included in `IntegrationsModule`, which is imported in `AppModule`. It is available in **any feature module** without additional imports.

```typescript
import { SmsService } from '../integrations/sms/sms.service';

@Injectable()
export class YourService {
  constructor(private readonly sms: SmsService) {}
}
```

---

### 4.2 Send a Single SMS (fire-and-forget)

Use `sendSms()` when you don't need to inspect the result. Errors are caught internally and logged — nothing is thrown to your caller.

```typescript
await this.sms.sendSms(user.phone, `Your OTP code is: ${code}. Valid for 5 minutes.`);
```

---

### 4.3 Send a Single SMS (with result)

Use `send()` when you need to check success, log the cost, or handle failure explicitly.

```typescript
const result = await this.sms.send({
  to: user.phone,
  message: `Your marriage application has been approved. Ref: ${ref}`,
});

if (!result.success) {
  this.logger.warn(`SMS failed: ${result.error}`);
}
```

---

### 4.4 Send to Multiple Recipients (bulk)

`sendBulk()` sends one message to many recipients in a **single API call**. Duplicate numbers are automatically removed.

```typescript
const phones = members.map((m) => m.phone);

const result = await this.sms.sendBulk({
  to: phones,
  message: 'Ramadan Mubarak from Rwanda Muslim Community!',
});

this.logger.log(
  `Bulk SMS: ${result.summary?.totalMessages} sent, cost ${result.summary?.cost} RWF`
);
```

---

### 4.5 Custom Sender / DLR URL

Both `send()` and `sendBulk()` accept optional overrides per call:

```typescript
await this.sms.send({
  to: applicant.phone,
  message: 'Your school registration is confirmed.',
  sender: 'RMCSchool',          // overrides the DB default sender name
  dlrUrl: 'https://api.rmc.org.rw/webhooks/school-sms', // overrides DB DLR URL
});
```

---

## 5. Phone Number Formats

The service accepts Rwanda phone numbers in any common format and normalises them all to `2507xxxxxxxxx` before sending.

| Input format | Normalised to |
|---|---|
| `0788123456` | `250788123456` |
| `+250788123456` | `250788123456` |
| `250788123456` | `250788123456` |

Invalid numbers (wrong length, non-Rwanda prefix) are **silently skipped** with a `WARN` log entry. If all recipients are invalid, `send()` returns `success: false`.

---

## 6. Return Value — SmsSendResult

```typescript
interface SmsSendResult {
  success: boolean;          // true if the gateway accepted the request
  provider: 'intouch' | 'console';
  recipients: string[];      // normalised numbers that were attempted
  details: SmsRecipientDetail[];
  summary?: SmsSendSummary;  // present on successful InTouch responses
  error?: string;            // present on failure
}

interface SmsRecipientDetail {
  status: 'P' | 'D' | 'Q' | 'E' | 'S' | 'U';
  message: string;
  cost: number;
  recipient: string;
  messageId: number;
}

interface SmsSendSummary {
  totalMessages: number;
  cost: number;       // RWF cost for this send
  balance: number;    // remaining account balance in RWF
  sentAt: string;     // ISO timestamp from the gateway
}
```

---

## 7. DLR Status Codes

When InTouch calls your `dlrUrl` webhook, it sends a GET request with two query parameters:

```
GET /webhooks/sms-delivery?messageid=55311547&status=D
```

| Status | Meaning |
|---|---|
| `P` | Message being Processed |
| `D` | Message Delivered |
| `Q` | Message Queued |
| `S` | Message Sent (accepted by carrier) |
| `E` | Message Errored |
| `U` | Message Undelivered |

Your webhook endpoint must respond with HTTP `200 OK`. The `DlrCallbackParams` interface from `sms.types.ts` can be used to type the query params:

```typescript
import { DlrCallbackParams } from '../integrations/sms/sms.types';

@Get('webhooks/sms-delivery')
handleDlr(@Query() params: DlrCallbackParams) {
  this.logger.log(`SMS ${params.messageid} → ${params.status}`);
  // update your DB record here
}
```

---

## 8. Admin REST Endpoints

All endpoints require a valid JWT and the `system:settings` permission.

| Method | Path | Description |
|---|---|---|
| `GET` | `/admin/system/sms-config` | View current config (password is masked) |
| `PATCH` | `/admin/system/sms-config` | Update credentials and settings |
| `POST` | `/admin/system/sms-config/activate` | Enable SMS sending |
| `POST` | `/admin/system/sms-config/deactivate` | Disable SMS (falls back to console log) |
| `POST` | `/admin/system/sms-config/refresh-cache` | Force-reload config cache from DB |

### GET response example

```json
{
  "id": "uuid...",
  "username": "RMC",
  "passwordSet": true,
  "senderName": "RMC",
  "dlrUrl": "https://api.rmc.org.rw/webhooks/sms-delivery",
  "isActive": true,
  "balanceRwf": "3726.00",
  "balanceUpdatedAt": "2026-06-24T10:30:00.000Z",
  "createdAt": "2026-06-24T08:00:00.000Z",
  "updatedAt": "2026-06-24T10:30:00.000Z"
}
```

### PATCH request body

```json
{
  "username": "RMC",
  "password": "your-intouch-password",
  "senderName": "RMC",
  "dlrUrl": "https://api.rmc.org.rw/webhooks/sms-delivery",
  "isActive": true
}
```

---

## 9. Security — Credential Encryption

The InTouch account password is **never stored in plaintext**. Before writing to the database, it is encrypted using **AES-256-GCM** (authenticated encryption). The encryption key is derived from `APP_ENCRYPTION_KEY` in `.env`.

```
DB column: password_enc
Format:    <12-byte IV> + <16-byte auth tag> + <ciphertext>  →  hex encoded
```

- The `GET /admin/system/sms-config` endpoint returns `passwordSet: true/false` — the plaintext is never exposed via API.
- If `APP_ENCRYPTION_KEY` changes, all existing encrypted values become unreadable. You must re-enter credentials via the admin panel after a key rotation.

---

## 10. Development / Console Mode

When no active configuration is found in the database (i.e. `isActive = false` or credentials are empty), **no real SMS is sent**. Instead, the message is printed to the application log:

```
[SMS][RMC→250788123456] Your OTP code is: 123456. Valid for 5 minutes.
```

This happens automatically in local development once you run the migration but before you set real credentials. You do not need to set any environment variable to enable this mode.

---

## 11. Error Handling & Retry

| Scenario | Behaviour |
|---|---|
| Network timeout (> 15 s) | Retry once after 1 s delay; return `success: false` on second failure |
| Gateway 5xx error | Retry once; return `success: false` on second failure |
| Gateway 400 Bad Request | **No retry** — bad request will not succeed on retry; return `success: false` immediately |
| All recipients invalid | Return `success: false` before any network call |
| Empty message | Throw `Error('SMS message cannot be empty.')` — caught by `sendSms()` |
| DB config unreadable | Fall back to console mode with a `WARN` log |
| Decryption failure (wrong key) | Disable SMS, log `ERROR`, fall back to console mode |

---

## 12. Common Use Cases

### OTP / Phone Verification

```typescript
// in auth.service.ts
await this.sms.sendSms(
  user.phone,
  `Your RMC verification code is: ${otp}. It expires in 5 minutes.`,
);
```

### Marriage Application Status Update

```typescript
await this.sms.send({
  to: application.applicantPhone,
  message: `Your marriage application (Ref: ${application.reference}) has been ${status}. Login to rmc.org.rw for details.`,
});
```

### Donation Receipt

```typescript
await this.sms.sendSms(
  donor.phone,
  `Thank you for your donation of ${amount} RWF to RMC. JazakAllahu Khairan.`,
);
```

### Mosque Announcement Broadcast

```typescript
const mosqueMemberPhones = members.map((m) => m.phone);

await this.sms.sendBulk({
  to: mosqueMemberPhones,
  message: `Assalamu Alaikum. ${announcement.title}. ${announcement.summary}`,
});
```

### Checking Result and Logging Cost

```typescript
const result = await this.sms.send({ to: phone, message });

if (result.success && result.summary) {
  await this.auditLog.record({
    action: 'sms_sent',
    meta: {
      recipients: result.recipients.length,
      costRwf: result.summary.cost,
      balanceRwf: result.summary.balance,
    },
  });
}
```
