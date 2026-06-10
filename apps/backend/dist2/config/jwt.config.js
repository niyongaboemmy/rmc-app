"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const config_1 = require("@nestjs/config");
exports.default = (0, config_1.registerAs)('jwt', () => ({
    accessSecret: process.env.JWT_ACCESS_SECRET || 'dev-access-secret-change-me',
    accessExpiry: process.env.JWT_ACCESS_EXPIRY || '15m',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'dev-refresh-secret-change-me',
    refreshExpiry: process.env.JWT_REFRESH_EXPIRY || '7d',
}));
//# sourceMappingURL=jwt.config.js.map