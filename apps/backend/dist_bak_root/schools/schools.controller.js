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
Object.defineProperty(exports, "__esModule", { value: true });
exports.SchoolsController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const public_decorator_1 = require("../common/decorators/public.decorator");
const schools_service_1 = require("./schools.service");
let SchoolsController = class SchoolsController {
    constructor(service) {
        this.service = service;
    }
    list() {
        return this.service.listPublic();
    }
};
exports.SchoolsController = SchoolsController;
__decorate([
    (0, common_1.Get)(),
    (0, public_decorator_1.Public)(),
    (0, swagger_1.ApiOperation)({ summary: 'List active Islamic schools for the public directory/map' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], SchoolsController.prototype, "list", null);
exports.SchoolsController = SchoolsController = __decorate([
    (0, swagger_1.ApiTags)('Schools'),
    (0, common_1.Controller)('schools'),
    __metadata("design:paramtypes", [schools_service_1.SchoolsService])
], SchoolsController);
//# sourceMappingURL=schools.controller.js.map