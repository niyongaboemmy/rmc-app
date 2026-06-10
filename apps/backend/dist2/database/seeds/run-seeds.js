"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("reflect-metadata");
const dotenv = require("dotenv");
dotenv.config();
const data_source_1 = require("../../../src/config/data-source");
const _01_provinces_districts_seed_1 = require("./01-provinces-districts.seed");
const _02_roles_admin_seed_1 = require("./02-roles-admin.seed");
async function runSeeds() {
    await data_source_1.AppDataSource.initialize();
    console.log('[Seed] Database connected. Running seeds...');
    await (0, _01_provinces_districts_seed_1.seedProvincesAndDistricts)(data_source_1.AppDataSource);
    await (0, _02_roles_admin_seed_1.seedRolesAndAdmin)(data_source_1.AppDataSource);
    await data_source_1.AppDataSource.destroy();
    console.log('[Seed] All seeds completed.');
}
runSeeds().catch((err) => {
    console.error('[Seed] Error:', err);
    process.exit(1);
});
//# sourceMappingURL=run-seeds.js.map