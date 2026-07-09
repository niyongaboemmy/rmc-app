import { SchoolsService } from './schools.service';
export declare class SchoolsController {
    private readonly service;
    constructor(service: SchoolsService);
    list(): Promise<import("./entities/school.entity").School[]>;
}
