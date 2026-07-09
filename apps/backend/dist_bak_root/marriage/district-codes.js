"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DISTRICT_CODES = void 0;
exports.districtCode = districtCode;
exports.DISTRICT_CODES = {
    nyarugenge: '01', gasabo: '02', kicukiro: '03',
    nyanza: '04', gisagara: '05', nyaruguru: '06', huye: '07', nyamagabe: '08', ruhango: '09', muhanga: '10', kamonyi: '11',
    karongi: '12', rutsiro: '13', rubavu: '14', nyabihu: '15', ngororero: '16', rusizi: '17', nyamasheke: '18',
    rulindo: '19', gakenke: '20', musanze: '21', burera: '22', gicumbi: '23',
    rwamagana: '24', nyagatare: '25', gatsibo: '26', kayonza: '27', kirehe: '28', ngoma: '29', bugesera: '30',
};
function districtCode(district) {
    if (!district)
        return null;
    return exports.DISTRICT_CODES[district.trim().toLowerCase()] ?? null;
}
//# sourceMappingURL=district-codes.js.map