"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MarriageMarkPaid1700000000011 = void 0;
class MarriageMarkPaid1700000000011 {
    constructor() {
        this.name = 'MarriageMarkPaid1700000000011';
    }
    async up(queryRunner) {
        await queryRunner.query(`
      UPDATE "marriage_applications"
      SET "payment_status" = 'paid',
          "amount_paid" = "amount_due"
      WHERE "payment_status" <> 'paid'
    `);
    }
    async down() {
    }
}
exports.MarriageMarkPaid1700000000011 = MarriageMarkPaid1700000000011;
//# sourceMappingURL=011-marriage-mark-paid.js.map