import { Province } from './province.entity';
export declare class District {
    id: string;
    name: string;
    code: string;
    provinceId: string;
    province: Province;
}
