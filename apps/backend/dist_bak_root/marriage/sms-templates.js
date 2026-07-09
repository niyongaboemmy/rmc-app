"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SmsTemplates = void 0;
exports.SmsTemplates = {
    submission(appNo, groomName, brideName) {
        return `RMC Nikah | App ${appNo}: ${groomName} & ${brideName} received. Under review shortly. Track at rwandamuslim.org`;
    },
    underReview(appNo) {
        return `RMC Nikah | App ${appNo}: Now under review. We will notify you of any update.`;
    },
    approved(appNo) {
        return `RMC Nikah | App ${appNo}: APPROVED. Our team will confirm your ceremony date soon. Mabrook!`;
    },
    rejected(appNo, reason) {
        const suffix = reason
            ? ` Reason: ${reason.slice(0, 60)}`
            : ' Contact nikah@rmc.rw for details.';
        return `RMC Nikah | App ${appNo}: NOT APPROVED.${suffix}`;
    },
    amendmentsRequested(appNo, notes) {
        const suffix = notes ? ` Note: ${notes.slice(0, 70)}` : ' Log in to update your application.';
        return `RMC Nikah | App ${appNo}: Amendments required.${suffix}`;
    },
    completed(appNo) {
        return `RMC Nikah | App ${appNo}: Ceremony complete. Certificate will be issued shortly. Mabrook!`;
    },
    closed(appNo) {
        return `RMC Nikah | App ${appNo}: Certificate ready. Download at rwandamuslim.org`;
    },
    ceremonyScheduled(appNo, date) {
        return `RMC Nikah | App ${appNo}: Ceremony confirmed — ${date}. Assalamu Alaikum!`;
    },
    paymentConfirmed(appNo, amount) {
        return `RMC Nikah | App ${appNo}: Payment of ${amount} RWF received. Application now being processed.`;
    },
    partyConfirmation(appNo, role, confirmLink) {
        return `RMC Nikah | App ${appNo}: You are listed as ${role}. Confirm: ${confirmLink}`;
    },
};
//# sourceMappingURL=sms-templates.js.map