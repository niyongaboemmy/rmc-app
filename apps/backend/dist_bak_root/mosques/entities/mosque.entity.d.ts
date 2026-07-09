export declare class Mosque {
    id: string;
    name: string;
    parentMosqueId: string | null;
    parentMosque: Mosque | null;
    address: string | null;
    gpsLat: number | null;
    gpsLng: number | null;
    provinceId: string | null;
    districtId: string | null;
    sectorId: string | null;
    capacity: number | null;
    foundingYear: number | null;
    phone: string | null;
    email: string | null;
    fridayPrayerTime: string | null;
    imamName: string | null;
    imamPhone: string | null;
    imamPhoto: string | null;
    status: string;
    createdAt: Date;
    updatedAt: Date;
}
