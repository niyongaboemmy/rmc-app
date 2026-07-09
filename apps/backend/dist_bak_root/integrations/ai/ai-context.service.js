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
var AiContextService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AiContextService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const mosque_entity_1 = require("../../mosques/entities/mosque.entity");
const TTL_MS = 60_000;
const MAX_MOSQUES = 400;
const MOSQUE_KEYWORDS = [
    'mosque',
    'mosqu',
    'masjid',
    'masjd',
    'imam',
    'imamu',
    'sheikh',
    'cheikh',
    'jumu',
    'friday prayer',
    'umusigiti',
    'imisigiti',
    'misigiti',
    'مسجد',
    'جامع',
    'إمام',
    'امام',
    'مساجد',
];
let AiContextService = AiContextService_1 = class AiContextService {
    constructor(mosques) {
        this.mosques = mosques;
        this.logger = new common_1.Logger(AiContextService_1.name);
        this.cache = null;
    }
    isMosqueQuery(message) {
        const lower = message.toLowerCase();
        return MOSQUE_KEYWORDS.some((k) => lower.includes(k));
    }
    async getMosqueDirectory() {
        if (this.cache && Date.now() - this.cache.at < TTL_MS)
            return this.cache.text;
        let text;
        try {
            const rows = await this.mosques.find({
                where: { status: (0, typeorm_2.Not)('inactive') },
                order: { name: 'ASC' },
                take: MAX_MOSQUES,
            });
            if (rows.length === 0) {
                text =
                    '## Registered mosques (live from the RMC database)\n' +
                        '(No mosques have been added to the directory yet. If a visitor asks about a specific ' +
                        "mosque or its imam, tell them it isn't listed in the directory yet and point them to the " +
                        'Find a Mosque tool on the Contact page (/contact).)';
            }
            else {
                const lines = rows.map((m) => {
                    const parts = [`- ${m.name}`];
                    if (m.address)
                        parts.push(`— ${m.address}`);
                    if (m.imamName)
                        parts.push(`; Imam: ${m.imamName}`);
                    const tel = m.imamPhone || m.phone;
                    if (tel)
                        parts.push(`; Tel: ${tel}`);
                    if (m.fridayPrayerTime)
                        parts.push(`; Jumu'ah ${m.fridayPrayerTime}`);
                    return parts.join(' ');
                });
                text =
                    `## Registered mosques (live from the RMC database) — ${rows.length} listed\n` +
                        'Use this list to answer questions about specific mosques and their imams. If a mosque a ' +
                        "visitor asks about is NOT in this list, say it isn't listed in the directory yet and suggest " +
                        'the Find a Mosque tool on the Contact page (/contact). Do not invent imam names or numbers.\n' +
                        lines.join('\n');
            }
        }
        catch (err) {
            this.logger.warn(`Failed to build mosque directory: ${err}`);
            text = '';
        }
        this.cache = { text, at: Date.now() };
        return text;
    }
};
exports.AiContextService = AiContextService;
exports.AiContextService = AiContextService = AiContextService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(mosque_entity_1.Mosque)),
    __metadata("design:paramtypes", [typeorm_2.Repository])
], AiContextService);
//# sourceMappingURL=ai-context.service.js.map