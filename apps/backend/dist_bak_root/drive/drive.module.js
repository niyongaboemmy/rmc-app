"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DriveModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const drive_item_entity_1 = require("./entities/drive-item.entity");
const drive_service_1 = require("./drive.service");
const drive_controller_1 = require("./drive.controller");
const user_entity_1 = require("../users/entities/user.entity");
let DriveModule = class DriveModule {
};
exports.DriveModule = DriveModule;
exports.DriveModule = DriveModule = __decorate([
    (0, common_1.Module)({
        imports: [typeorm_1.TypeOrmModule.forFeature([drive_item_entity_1.DriveItem, drive_item_entity_1.DriveShare, user_entity_1.User])],
        providers: [drive_service_1.DriveService],
        controllers: [drive_controller_1.DriveController],
        exports: [drive_service_1.DriveService],
    })
], DriveModule);
//# sourceMappingURL=drive.module.js.map