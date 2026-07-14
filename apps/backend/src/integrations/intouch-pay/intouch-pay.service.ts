import { Injectable, Logger } from '@nestjs/common';
import { createHash } from 'crypto';

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

  // ── §2. Request Payment (collect from subscriber) ──────────────────────────

  async requestPayment(req: IntouchPayRequest): Promise<IntouchPayResult> {
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

    return this.formPost(req.gatewayUrl ?? DEFAULT_PAYMENT_URL, params, req.transactionId);
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

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data: Record<string, unknown> = await res.json();
      const rc = String(data['responsecode'] ?? '');
      const status = this.resolveStatus(rc, String(data['status'] ?? ''));

      return {
        requestTransactionId: opts.requestTransactionId,
        transactionId: opts.transactionId,
        status,
        responseCode: rc,
        message: String(data['message'] ?? INTOUCH_RESPONSE_CODES[rc] ?? ''),
      };
    } catch (err) {
      // Network error — we cannot determine the payment outcome.
      // Return PENDING so callers do NOT permanently mark the donation as failed.
      this.logger.error(`[IntouchPay] GetTransactionStatus network error: ${err}`);
      return {
        requestTransactionId: opts.requestTransactionId,
        transactionId: opts.transactionId,
        status: 'PENDING',
        responseCode: 'NETWORK_ERROR',
        message: 'Status check unreachable — will retry',
      };
    }
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

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: params.toString(),
      });
      const data: Record<string, unknown> = await res.json();
      return {
        balance: String(data['balance'] ?? '0.0'),
        success: data['success'] === true || data['success'] === 'true',
        responseCode: String(data['responsecode'] ?? ''),
        message: String(data['message'] ?? ''),
      };
    } catch (err) {
      this.logger.error(`[IntouchPay] GetBalance error: ${err}`);
      return { balance: '0.0', success: false, message: 'Balance inquiry failed' };
    }
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

  // ── Private helpers ───────────────────────────────────────────────────────

  private async formPost(
    url: string,
    params: URLSearchParams,
    txId: string,
  ): Promise<IntouchPayResult> {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: params.toString(),
      });
      const data: Record<string, unknown> = await res.json();
      const rc = String(data['responsecode'] ?? '');
      const status = this.resolveStatus(rc, String(data['status'] ?? ''));

      return {
        requestTransactionId: txId,
        transactionId: String(data['transactionid'] ?? ''),
        status,
        responseCode: rc,
        message: String(data['message'] ?? data['statusdesc'] ?? INTOUCH_RESPONSE_CODES[rc] ?? ''),
        raw: data,
      };
    } catch (err) {
      // Network error — IntouchPay may have received and processed the request.
      // Return PENDING so the donation is not permanently marked as failed.
      this.logger.error(`[IntouchPay] POST ${url} network error: ${err}`);
      return {
        requestTransactionId: txId,
        transactionId: '',
        status: 'PENDING',
        responseCode: 'NETWORK_ERROR',
        message: 'Gateway unreachable — treat as pending',
      };
    }
  }
}
