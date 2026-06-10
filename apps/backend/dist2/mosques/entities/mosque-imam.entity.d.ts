import { Mosque } from './mosque.entity';
export declare class MosqueImam {
    id: string;
    mosqueId: string;
    mosque: Mosque;
    userId: string;
    isPrimary: boolean;
    startDate: Date;
    endDate: Date | null;
    createdAt: Date;
}
