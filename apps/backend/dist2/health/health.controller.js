"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.HealthController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const inject_redis_decorator_1 = require("../common/decorators/inject-redis.decorator");
const public_decorator_1 = require("../common/decorators/public.decorator");
let HealthController = class HealthController {
    constructor(dataSource, redis) {
        this.dataSource = dataSource;
        this.redis = redis;
    }
    async getHealth() {
        const services = {
            database: 'error',
            redis: 'error',
        };
        try {
            await this.dataSource.query('SELECT 1');
            services['database'] = 'ok';
        }
        catch {
        }
        try {
            await this.redis.ping();
            services['redis'] = 'ok';
        }
        catch {
        }
        return {
            status: 'ok',
            version: '1.0.0',
            environment: process.env.NODE_ENV || 'development',
            timestamp: new Date().toISOString(),
            services,
        };
    }
};
exports.HealthController = HealthController;
__decorate([
    (0, public_decorator_1.Public)(),
    (0, common_1.Get)(),
    (0, swagger_1.ApiOperation)({ summary: 'Health check — returns DB and Redis status' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], HealthController.prototype, "getHealth", null);
exports.HealthController = HealthController = __decorate([
    (0, swagger_1.ApiTags)('Health'),
    (0, common_1.Controller)('health'),
    __param(0, (0, typeorm_1.InjectDataSource)()),
    __param(1, (0, inject_redis_decorator_1.InjectRedis)()),
    __metadata("design:paramtypes", [typeorm_2.DataSource, Function])
], HealthController);
//# sourceMappingURL=health.controller.js.map