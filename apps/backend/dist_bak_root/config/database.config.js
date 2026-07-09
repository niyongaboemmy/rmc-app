"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const config_1 = require("@nestjs/config");
exports.default = (0, config_1.registerAs)('database', () => ({
    type: 'postgres',
    url: process.env.DATABASE_URL,
    entities: [__dirname + '/../**/*.entity.{js,ts}'],
    migrations: [__dirname + '/../database/migrations/*.{js,ts}'],
    migrationsRun: false,
    synchronize: false,
    logging: process.env.NODE_ENV === 'production' ? ['error', 'warn'] : ['error'],
    ssl: process.env.DATABASE_SSL === 'true' ||
        process.env.NODE_ENV === 'production'
        ? { rejectUnauthorized: false }
        : false,
    extra: { max: 10 },
}));
//# sourceMappingURL=database.config.js.map