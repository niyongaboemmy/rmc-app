"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var IntouchPayService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.IntouchPayService = exports.DEFAULT_DEPOSIT_URL = exports.INTOUCH_RESPONSE_CODES = void 0;
const common_1 = require("@nestjs/common");
const crypto_1 = require("crypto");
exports.INTOUCH_RESPONSE_CODES = {
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
    '3000': 'Missing Transaction ID Information',
    '3200': 'Missing Request Transaction ID Information',
    '3100': "Transaction Doesn't Exist",
};
const DEFAULT_PAYMENT_URL = 'https://www.intouchpay.co.rw/api/requestpayment/';
exports.DEFAULT_DEPOSIT_URL = 'https://www.intouchpay.co.rw/api/requestdeposit/';
const DEFAULT_STATUS_URL = 'https://www.intouchpay.co.rw/api/gettransactionstatus/';
const DEFAULT_BALANCE_URL = 'https://www.intouchpay.co.rw/api/getbalance/';
let IntouchPayService = IntouchPayService_1 = class IntouchPayService {
    constructor() {
        this.logger = new common_1.Logger(IntouchPayService_1.name);
    }
    async requestPayment(req) {
        const timestamp = this.buildTimestamp();
        const password = this.generatePassword(req.username, req.accountNo, req.partnerPassword, timestamp);
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
        if (req.callbackUrl)
            params.set('callbackurl', req.callbackUrl);
        this.logger.log(`[IntouchPay] RequestPayment → ${req.mobilePhone} ${req.amount} RWF (txn: ${req.transactionId})`);
        return this.formPost(req.gatewayUrl ?? DEFAULT_PAYMENT_URL, params, req.transactionId);
    }
    async getTransactionStatus(opts) {
        const timestamp = this.buildTimestamp();
        const password = this.generatePassword(opts.username, opts.accountNo, opts.partnerPassword, timestamp);
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
            const data = await res.json();
            const rc = String(data['responsecode'] ?? '');
            const status = this.resolveStatus(rc, String(data['status'] ?? ''));
            return {
                requestTransactionId: opts.requestTransactionId,
                transactionId: opts.transactionId,
                status,
                responseCode: rc,
                message: String(data['message'] ?? exports.INTOUCH_RESPONSE_CODES[rc] ?? ''),
            };
        }
        catch (err) {
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
    async getBalance(opts) {
        const timestamp = this.buildTimestamp();
        const password = this.generatePassword(opts.username, opts.accountNo, opts.partnerPassword, timestamp);
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
            const data = await res.json();
            return {
                balance: String(data['balance'] ?? '0.0'),
                success: data['success'] === true || data['success'] === 'true',
                responseCode: String(data['responsecode'] ?? ''),
                message: String(data['message'] ?? ''),
            };
        }
        catch (err) {
            this.logger.error(`[IntouchPay] GetBalance error: ${err}`);
            return { balance: '0.0', success: false, message: 'Balance inquiry failed' };
        }
    }
    normalizePhone(phone) {
        const digits = phone.replace(/\D/g, '');
        if (digits.startsWith('250'))
            return digits;
        if (digits.startsWith('0'))
            return '250' + digits.slice(1);
        return digits;
    }
    buildTimestamp() {
        return new Date()
            .toISOString()
            .replace(/[-:.TZ]/g, '')
            .slice(0, 14);
    }
    generatePassword(username, accountNo, partnerPassword, timestamp) {
        return (0, crypto_1.createHash)('sha256')
            .update(username + accountNo + partnerPassword + timestamp)
            .digest('hex');
    }
    resolveStatus(responseCode, statusText) {
        const s = statusText.toLowerCase();
        if (s === 'successfull' || s === 'successful')
            return 'SUCCESSFUL';
        if (responseCode === '01' || responseCode === '2001')
            return 'SUCCESSFUL';
        if (responseCode === '1000')
            return 'PENDING';
        return 'FAILED';
    }
    async formPost(url, params, txId) {
        try {
            const res = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: params.toString(),
            });
            const data = await res.json();
            const rc = String(data['responsecode'] ?? '');
            const status = this.resolveStatus(rc, String(data['status'] ?? ''));
            return {
                requestTransactionId: txId,
                transactionId: String(data['transactionid'] ?? ''),
                status,
                responseCode: rc,
                message: String(data['message'] ?? data['statusdesc'] ?? exports.INTOUCH_RESPONSE_CODES[rc] ?? ''),
                raw: data,
            };
        }
        catch (err) {
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
};
exports.IntouchPayService = IntouchPayService;
exports.IntouchPayService = IntouchPayService = IntouchPayService_1 = __decorate([
    (0, common_1.Injectable)()
], IntouchPayService);
//# sourceMappingURL=intouch-pay.service.js.map