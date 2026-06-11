"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InjectRedis = exports.REDIS_CLIENT = void 0;
const common_1 = require("@nestjs/common");
exports.REDIS_CLIENT = 'REDIS_CLIENT';
const InjectRedis = () => (0, common_1.Inject)(exports.REDIS_CLIENT);
exports.InjectRedis = InjectRedis;
//# sourceMappingURL=inject-redis.decorator.js.map