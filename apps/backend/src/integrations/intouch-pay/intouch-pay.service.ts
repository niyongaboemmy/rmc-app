import { Injectable, Logger } from '@nestjs/common';
import { createHash } from 'crypto';
import { PaymentEventsService } from './payment-events.service';
import { PaymentSimulatorService } from './payment-simulator.service';
import { PaymentOperation } from './entities/payment-provider-event.entity';

export interface IntouchPayRequest {
  username: string;
  partnerPassword: string;
  accountNo: string;
  amount: number;
  mobilePhone: string;
  transactionId: string;
  /** Human-readable description shown on the donor's MoMo USSD prompt and SMS. */
  reason?: string;
  callbackUrl?: string;
  gatewayUrl?: string;
}

export interface IntouchPayResult {
  requestTransactionId: string;
  transactionId: string;
  status: 'PENDING' | 'SUCCESSFUL' | 'FAILED';
  responseCode: string;
  message: string;
  raw?: Record<string, unknown>;
}

export interface IntouchPayStatusResult {
  requestTransactionId: string;
  transactionId: string;
  status: 'PENDING' | 'SUCCESSFUL' | 'FAILED';
  responseCode: string;
  message: string;
}

export interface IntouchPayDepositRequest {
  username: string;
  partnerPassword: string;
  accountNo: string;
  amount: number;
  mobilePhone: string;
  transactionId: string;
  /** Reason shown to the recipient for the deposit. */
  reason?: string;
  /** Set true to include withdraw charges in the amount sent to the subscriber. */
  withdrawCharge?: boolean;
  gatewayUrl?: string;
}

export interface IntouchPayDepositResult {
  requestTransactionId: string;
  /** IntouchPay's reference id — only present when the deposit succeeded (§3.6). */
  referenceId: string;
  status: 'SUCCESSFUL' | 'FAILED';
  responseCode: string;
  message: string;
  raw?: Record<string, unknown>;
}

export interface IntouchPayBalanceResult {
  balance: string;
  success: boolean;
  responseCode?: string;
  message?: string;
}

// §2.9 — Receiving Payment response codes
export const INTOUCH_RESPONSE_CODES: Record<string, string> = {
  '1000': 'Pending',
  '01': 'Successful',
  '0002': 'Missing Username Information',
  '0003': 'Missing Password Information',
  '0004': 'Missing Date Information',
  '0005': 'Invalid Password',
  '0006': 'User Does not have an IntouchPay Account',
  '0007': 'No such user',
  '0008': 'Failed to Authenticate',
  '2100': 'Amount should be greater than 0',
  '2200': 'Amount below minimum',
  '2300': 'Amount above maximum',
  '2400': 'Duplicate Transaction ID',
  '2500': 'Route Not Found',
  '2600': 'Operation Not Allowed',
  '2700': 'Failed to Complete Transaction',
  '1005': 'Failed Due to Insufficient Funds',
  '1002': 'Mobile number not registered on mobile money',
  '1008': 'General Failure',
  '1200': 'Invalid Number',
  '1100': 'Number not supported on this Mobile Money network',
  '1300': 'Failed to Complete Transaction, Unknown Exception',
  // §3.7 — Sending Payment (deposit) response codes
  '1101': 'Service ID not Recognized',
  '1102': 'Invalid Mobile Phone Number',
  '1103': 'Payment Above Allowed Maximum',
  '1104': 'Payment Below Allowed Minimum',
  '1105': 'Network Not Supported',
  '1106': 'Operation Not Permitted',
  '1107': 'Payment Account Not Configured',
  '1108': 'Insufficient Account Balance',
  '1110': 'Duplicate Remit ID',
  '2001': 'Request Successful',
  '2003': 'Transaction Not Allowed',
  '2102': 'Subscriber Could not be Identified',
  '2105': 'Non Existent Mobile Account',
  '2106': 'Own Mobile Account Provided',
  '2107': 'Invalid Amount Format',
  '2108': 'Insufficient Funds on Source Account',
  '2109': 'Daily Limit Exceeded',
  '2110': 'Source Account Not Active',
  '2111': 'Mobile Account Not Active',
  '2000': 'General Failure',
  '2510': 'Service Temporarily Unavailable',
  '2518': 'Could Not Perform Operation',
  '2520': 'Incorrect Account Password',
  '2522': 'Invalid Amount',
  '2525': 'Resource Not Active',
  '2800': 'Deposit Channel Failure',
  // §4.7 — Get Transaction Status response codes
  '3000': 'Missing Transaction ID Information',
  '3200': 'Missing Request Transaction ID Information',
  '3100': "Transaction Doesn't Exist",
};

const DEFAULT_PAYMENT_URL = 'https://www.intouchpay.co.rw/api/requestpayment/';
export const DEFAULT_DEPOSIT_URL = 'https://www.intouchpay.co.rw/api/requestdeposit/';
const DEFAULT_STATUS_URL = 'https://www.intouchpay.co.rw/api/gettransactionstatus/';
const DEFAULT_BALANCE_URL = 'https://www.intouchpay.co.rw/api/getbalance/';

@Injectable()
export class IntouchPayService {
  private readonly logger = new Logger(IntouchPayService.name);

  constructor(
    private readonly events: PaymentEventsService,
    private readonly simulator: PaymentSimulatorService,
  ) {}

  // ── Resilience config (env-overridable, sane defaults) ─────────────────────

  /** Per-attempt request timeout. A slow/hung provider is aborted after this. */
  private get timeoutMs(): number {
    return Number(process.env.PAYMENT_TIMEOUT_MS) || 20_000;
  }
  /** Extra attempts for READ-ONLY calls only (status/balance). Charges are never auto-retried. */
  private get maxRetries(): number {
    const n = Number(process.env.PAYMENT_MAX_RETRIES);
    return Number.isFinite(n) ? Math.max(0, n) : 2;
  }
  private get backoffMs(): number {
    return Number(process.env.PAYMENT_RETRY_BACKOFF_MS) || 500;
  }
  /** Latency at/above which an attempt is flagged "slow" for monitoring. */
  private get slowMs(): number {
    return Number(process.env.PAYMENT_SLOW_MS) || 8_000;
  }

  // ── §2. Request Payment (collect from subscriber) ──────────────────────────

  async requestPayment(req: IntouchPayRequest): Promise<IntouchPayResult> {
    if (this.simulator.isActive()) {
      const sim = await this.simulate('request_payment', req.transactionId);
      return {
        requestTransactionId: req.transactionId,
        transactionId: sim.transactionId,
        status: sim.status,
        responseCode: sim.responseCode,
        message: sim.message,
      };
    }

    const timestamp = this.buildTimestamp();
    const password = this.generatePassword(
      req.username,
      req.accountNo,
      req.partnerPassword,
      timestamp,
    );

    // §2.3 Python example uses `mobilephone` (the §2.5 table lists `mobilephoneno` but that is a typo)
    // Phone must be international format: 250XXXXXXXXX
    const params = new URLSearchParams({
      username: req.username,
      timestamp,
      amount: String(req.amount),
      password,
      mobilephone: this.normalizePhone(req.mobilePhone),
      requesttransactionid: req.transactionId,
      accountno: req.accountNo,
      reason: req.reason ?? 'RMC Donation',
    });
    if (req.callbackUrl) params.set('callbackurl', req.callbackUrl);

    this.logger.log(
      `[IntouchPay] RequestPayment → ${req.mobilePhone} ${req.amount} RWF (txn: ${req.transactionId})`,
    );

    // A charge is NOT retryable: a blindly re-sent request risks a double charge
    // (or a "2400 Duplicate Transaction ID" rejection). On timeout/outage we
    // return PENDING and let status polling + the reconciler settle it.
    const { data, degraded } = await this.request(
      'request_payment',
      req.gatewayUrl ?? DEFAULT_PAYMENT_URL,
      {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: params.toString(),
      },
      { retryable: false, requestTransactionId: req.transactionId },
    );

    if (degraded) {
      return {
        requestTransactionId: req.transactionId,
        transactionId: '',
        status: 'PENDING',
        responseCode: degraded.code,
        message: degraded.message,
      };
    }

    const rc = String(data!['responsecode'] ?? '');
    return {
      requestTransactionId: req.transactionId,
      transactionId: String(data!['transactionid'] ?? ''),
      status: this.resolveStatus(rc, String(data!['status'] ?? '')),
      responseCode: rc,
      message: String(data!['message'] ?? data!['statusdesc'] ?? INTOUCH_RESPONSE_CODES[rc] ?? ''),
      raw: data,
    };
  }

  // ── §3. Request Deposit (send money to a subscriber) ───────────────────────

  async requestDeposit(req: IntouchPayDepositRequest): Promise<IntouchPayDepositResult> {
    const timestamp = this.buildTimestamp();
    const password = this.generatePassword(
      req.username,
      req.accountNo,
      req.partnerPassword,
      timestamp,
    );

    // §3.3 Python example uses `mobilephone` (the §3.5 table lists `mobilephoneno` but that
    // mirrors the same typo already noted for §2.5 request payment).
    const params = new URLSearchParams({
      username: req.username,
      timestamp,
      amount: String(req.amount),
      withdrawcharge: req.withdrawCharge ? '1' : '0',
      reason: req.reason ?? 'RMC Payment',
      sid: '1',
      password,
      mobilephone: this.normalizePhone(req.mobilePhone),
      requesttransactionid: req.transactionId,
      accountno: req.accountNo,
    });

    const url = req.gatewayUrl ?? DEFAULT_DEPOSIT_URL;

    this.logger.log(
      `[IntouchPay] RequestDeposit → ${req.mobilePhone} ${req.amount} RWF (txn: ${req.transactionId})`,
    );

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: params.toString(),
      });
      const data: Record<string, unknown> = await res.json();
      const rc = String(data['responsecode'] ?? '');
      const success = data['success'] === true || data['success'] === 'true';

      return {
        requestTransactionId: req.transactionId,
        referenceId: String(data['referenceid'] ?? ''),
        status: success ? 'SUCCESSFUL' : 'FAILED',
        responseCode: rc,
        message: String(data['message'] ?? INTOUCH_RESPONSE_CODES[rc] ?? ''),
        raw: data,
      };
    } catch (err) {
      this.logger.error(`[IntouchPay] RequestDeposit error: ${err}`);
      return {
        requestTransactionId: req.transactionId,
        referenceId: '',
        status: 'FAILED',
        responseCode: 'NETWORK_ERROR',
        message: 'Gateway unreachable',
      };
    }
  }

  // ── §4. Get Transaction Status ─────────────────────────────────────────────
  // §4.3 uses json=data (JSON body), NOT form-post

  async getTransactionStatus(opts: {
    username: string;
    partnerPassword: string;
    accountNo: string;
    requestTransactionId: string;
    transactionId: string;
    gatewayBaseUrl?: string;
  }): Promise<IntouchPayStatusResult> {
    if (this.simulator.isActive()) {
      const sim = await this.simulate('get_status', opts.requestTransactionId);
      return {
        requestTransactionId: opts.requestTransactionId,
        transactionId: opts.transactionId,
        status: sim.status,
        responseCode: sim.responseCode,
        message: sim.message,
      };
    }

    const timestamp = this.buildTimestamp();
    const password = this.generatePassword(
      opts.username,
      opts.accountNo,
      opts.partnerPassword,
      timestamp,
    );

    const body = {
      username: opts.username,
      timestamp,
      password,
      requesttransactionid: opts.requestTransactionId,
      transactionid: opts.transactionId,
    };

    const url = opts.gatewayBaseUrl
      ? opts.gatewayBaseUrl.replace(/requestpayment\/?$/, 'gettransactionstatus/')
      : DEFAULT_STATUS_URL;

    this.logger.log(`[IntouchPay] GetTransactionStatus → txn: ${opts.requestTransactionId}`);

    // Status checks are read-only and idempotent → safe to retry with backoff.
    const { data, degraded } = await this.request(
      'get_status',
      url,
      { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) },
      { retryable: true, requestTransactionId: opts.requestTransactionId },
    );

    if (degraded) {
      // We cannot determine the outcome — return PENDING so callers never
      // permanently mark a payment as failed on a transient outage.
      return {
        requestTransactionId: opts.requestTransactionId,
        transactionId: opts.transactionId,
        status: 'PENDING',
        responseCode: degraded.code,
        message: degraded.message,
      };
    }

    const rc = String(data!['responsecode'] ?? '');
    return {
      requestTransactionId: opts.requestTransactionId,
      transactionId: opts.transactionId,
      status: this.resolveStatus(rc, String(data!['status'] ?? '')),
      responseCode: rc,
      message: String(data!['message'] ?? INTOUCH_RESPONSE_CODES[rc] ?? ''),
    };
  }

  // ── §5. Balance Inquiry ────────────────────────────────────────────────────
  // §5.3 uses data=data (form-post), params: username, timestamp, accountno, password

  async getBalance(opts: {
    username: string;
    partnerPassword: string;
    accountNo: string;
    gatewayBaseUrl?: string;
  }): Promise<IntouchPayBalanceResult> {
    const timestamp = this.buildTimestamp();
    const password = this.generatePassword(
      opts.username,
      opts.accountNo,
      opts.partnerPassword,
      timestamp,
    );

    const params = new URLSearchParams({
      username: opts.username,
      timestamp,
      accountno: opts.accountNo,
      password,
    });

    const url = opts.gatewayBaseUrl
      ? opts.gatewayBaseUrl.replace(/requestpayment\/?$/, 'getbalance/')
      : DEFAULT_BALANCE_URL;

    this.logger.log(`[IntouchPay] GetBalance for account ${opts.accountNo}`);

    const { data, degraded } = await this.request(
      'get_balance',
      url,
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: params.toString() },
      { retryable: true, requestTransactionId: `balance-${opts.accountNo}` },
    );

    if (degraded) {
      return {
        balance: '0.0',
        success: false,
        message: 'Balance inquiry failed',
        responseCode: degraded.code,
      };
    }
    return {
      balance: String(data!['balance'] ?? '0.0'),
      success: data!['success'] === true || data!['success'] === 'true',
      responseCode: String(data!['responsecode'] ?? ''),
      message: String(data!['message'] ?? ''),
    };
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  /**
   * Normalise Rwanda mobile numbers to IntouchPay's required format: 250XXXXXXXXX (12 digits).
   * Accepts: 0780313448 → 250780313448, +250780313448 → 250780313448, 250780313448 → unchanged.
   */
  normalizePhone(phone: string): string {
    const digits = phone.replace(/\D/g, '');
    if (digits.startsWith('250')) return digits;
    if (digits.startsWith('0')) return '250' + digits.slice(1);
    return digits;
  }

  /** yyyymmddhhmmss in UTC — exact format from §2.4 */
  buildTimestamp(): string {
    return new Date()
      .toISOString()
      .replace(/[-:.TZ]/g, '')
      .slice(0, 14);
  }

  /** SHA256(username + accountno + partnerpassword + timestamp).hexdigest() */
  generatePassword(
    username: string,
    accountNo: string,
    partnerPassword: string,
    timestamp: string,
  ): string {
    return createHash('sha256')
      .update(username + accountNo + partnerPassword + timestamp)
      .digest('hex');
  }

  /**
   * Maps response code + status text to PENDING / SUCCESSFUL / FAILED.
   * '01'   = successful payment (§2.9)
   * '2001' = successful deposit (§3.7)
   * '1000' = pending (§2.9)
   */
  resolveStatus(responseCode: string, statusText: string): 'PENDING' | 'SUCCESSFUL' | 'FAILED' {
    const s = statusText.toLowerCase();
    if (s === 'successfull' || s === 'successful') return 'SUCCESSFUL';
    if (responseCode === '01' || responseCode === '2001') return 'SUCCESSFUL';
    if (responseCode === '1000') return 'PENDING';
    return 'FAILED';
  }

  // ── Resilient HTTP core ─────────────────────────────────────────────────────

  /**
   * POSTs to the provider with a hard timeout, optional bounded retries (with
   * exponential backoff) for read-only calls, per-attempt latency logging, and
   * monitoring events. Returns the parsed JSON on success, or a `degraded`
   * marker (TIMEOUT / NETWORK_ERROR) when the provider never gave a usable
   * answer — callers map that to a PENDING/"try again shortly" state rather
   * than a hard failure.
   */
  private async request(
    operation: PaymentOperation,
    url: string,
    init: { headers: Record<string, string>; body: string },
    opts: { retryable: boolean; requestTransactionId: string },
  ): Promise<{ data?: Record<string, unknown>; degraded?: { code: string; message: string } }> {
    const attempts = opts.retryable ? this.maxRetries + 1 : 1;

    for (let attempt = 1; attempt <= attempts; attempt++) {
      const start = Date.now();
      try {
        const res = await this.fetchWithTimeout(url, { method: 'POST', ...init });
        const data = (await res.json()) as Record<string, unknown>;
        const latencyMs = Date.now() - start;
        const slow = latencyMs >= this.slowMs;
        this.events.record({
          operation,
          outcome: 'success',
          latencyMs,
          slow,
          attempt,
          requestTransactionId: opts.requestTransactionId,
          responseCode: String(data['responsecode'] ?? ''),
        });
        if (slow) {
          this.logger.warn(
            `[IntouchPay] SLOW ${operation} took ${latencyMs}ms (txn ${opts.requestTransactionId})`,
          );
        }
        return { data };
      } catch (err) {
        const latencyMs = Date.now() - start;
        const isTimeout = (err as Error)?.name === 'AbortError';
        this.events.record({
          operation,
          outcome: isTimeout ? 'timeout' : 'error',
          latencyMs,
          attempt,
          requestTransactionId: opts.requestTransactionId,
          detail: String(err),
        });
        this.logger.error(
          `[IntouchPay] ${operation} attempt ${attempt}/${attempts} ${
            isTimeout ? `TIMED OUT after ${latencyMs}ms` : `ERROR: ${err}`
          } (txn ${opts.requestTransactionId})`,
        );

        if (attempt < attempts) {
          await this.sleep(this.backoffMs * attempt);
          continue;
        }
        return {
          degraded: isTimeout
            ? {
                code: 'TIMEOUT',
                message: 'Payment is taking longer than expected. Please try again shortly.',
              }
            : {
                code: 'NETWORK_ERROR',
                message:
                  'Payment service is temporarily unavailable. Any payment made will be confirmed automatically once it clears.',
              },
        };
      }
    }
    // Unreachable, but keeps the type checker happy.
    return { degraded: { code: 'NETWORK_ERROR', message: 'Payment service unavailable.' } };
  }

  /** fetch() that aborts after `timeoutMs`, turning a hung provider into a catchable AbortError. */
  private async fetchWithTimeout(
    url: string,
    init: { method: string; headers: Record<string, string>; body: string },
  ): Promise<Response> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      return await fetch(url, { ...init, signal: controller.signal });
    } finally {
      clearTimeout(timer);
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * DEV/TEST only — returns a forced outcome (and records a monitoring event)
   * instead of calling the real gateway, so payment resilience can be exercised
   * without live MoMo credentials. Never reached in production (mode stays 'off').
   */
  private async simulate(
    operation: PaymentOperation,
    requestTransactionId: string,
  ): Promise<{
    status: 'PENDING' | 'SUCCESSFUL' | 'FAILED';
    responseCode: string;
    message: string;
    transactionId: string;
  }> {
    const { mode, delayMs } = this.simulator.state;
    const start = Date.now();
    const record = (outcome: 'success' | 'timeout' | 'error', responseCode: string) => {
      const latencyMs = Date.now() - start;
      this.events.record({
        operation,
        outcome,
        latencyMs,
        slow: latencyMs >= this.slowMs,
        requestTransactionId,
        responseCode,
        simulated: true,
        detail: `simulator:${mode}`,
      });
    };
    this.logger.warn(`[IntouchPay][SIM] ${operation} forced mode="${mode}"`);

    switch (mode) {
      case 'slow':
        await this.sleep(delayMs);
        record('success', '01');
        return {
          status: 'SUCCESSFUL',
          responseCode: '01',
          message: '[SIM] Payment successful (after delay)',
          transactionId: `SIM-${requestTransactionId}`,
        };
      case 'timeout':
        // Brief representative pause, then the timeout/degraded path.
        await this.sleep(Math.min(this.timeoutMs, 1500));
        record('timeout', 'TIMEOUT');
        return {
          status: 'PENDING',
          responseCode: 'TIMEOUT',
          message: 'Payment is taking longer than expected. Please try again shortly.',
          transactionId: '',
        };
      case 'unavailable':
        record('error', 'NETWORK_ERROR');
        return {
          status: 'PENDING',
          responseCode: 'NETWORK_ERROR',
          message:
            'Payment service is temporarily unavailable. Any payment made will be confirmed automatically once it clears.',
          transactionId: '',
        };
      case 'fail':
        record('success', '1005');
        return {
          status: 'FAILED',
          responseCode: '1005',
          message: '[SIM] Failed Due to Insufficient Funds',
          transactionId: `SIM-${requestTransactionId}`,
        };
      case 'success':
      default:
        record('success', '01');
        return {
          status: 'SUCCESSFUL',
          responseCode: '01',
          message: '[SIM] Payment successful',
          transactionId: `SIM-${requestTransactionId}`,
        };
    }
  }
}
