"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MosquesModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const mosque_entity_1 = require("./entities/mosque.entity");
const mosque_imam_entity_1 = require("./entities/mosque-imam.entity");
const mosques_service_1 = require("./mosques.service");
const mosques_controller_1 = require("./mosques.controller");
let MosquesModule = class MosquesModule {
};
exports.MosquesModule = MosquesModule;
exports.MosquesModule = MosquesModule = __decorate([
    (0, common_1.Module)({
        imports: [typeorm_1.TypeOrmModule.forFeature([mosque_entity_1.Mosque, mosque_imam_entity_1.MosqueImam])],
        providers: [mosques_service_1.MosquesService],
        controllers: [mosques_controller_1.MosquesController],
        exports: [mosques_service_1.MosquesService, typeorm_1.TypeOrmModule],
    })
], MosquesModule);
//# sourceMappingURL=mosques.module.js.map