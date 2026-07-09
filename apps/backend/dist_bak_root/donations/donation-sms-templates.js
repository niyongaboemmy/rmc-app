"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DonationSmsTemplates = void 0;
exports.DonationSmsTemplates = {
    paymentConfirmed(amount, currency, donorName) {
        const who = donorName ? ` ${donorName},` : '';
        return `RMC Donations |${who} JazakAllah khairan! Your gift of ${amount} ${currency} is received. May Allah bless you. rwandamuslim.org`;
    },
};
//# sourceMappingURL=donation-sms-templates.js.map