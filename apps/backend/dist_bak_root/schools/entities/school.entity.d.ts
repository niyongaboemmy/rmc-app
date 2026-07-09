export declare enum SchoolLevel {
    PRIMARY = "primary",
    SECONDARY = "secondary",
    MADRASSA = "madrassa",
    TVET = "tvet"
}
export declare enum SchoolStatus {
    ACTIVE = "active",
    INACTIVE = "inactive"
}
export declare class School {
    id: string;
    name: string;
    level: SchoolLevel;
    principalName: string | null;
    phone: string | null;
    email: string | null;
    district: string | null;
    provinceCode: string | null;
    gpsLat: number | null;
    gpsLng: number | null;
    status: SchoolStatus;
    createdAt: Date;
    updatedAt: Date;
}
