"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PaymentEventsService = void 0;
const common_1 = require("@nestjs/common");
const rxjs_1 = require("rxjs");
let PaymentEventsService = class PaymentEventsService {
    constructor() {
        this.bus = new rxjs_1.Subject();
    }
    emit(event) {
        this.bus.next(event);
    }
    get stream$() {
        return this.bus.asObservable();
    }
};
exports.PaymentEventsService = PaymentEventsService;
exports.PaymentEventsService = PaymentEventsService = __decorate([
    (0, common_1.Injectable)()
], PaymentEventsService);
//# sourceMappingURL=payment-events.service.js.map