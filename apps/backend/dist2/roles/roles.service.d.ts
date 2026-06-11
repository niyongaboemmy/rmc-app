import { Repository } from 'typeorm';
import { Role } from './entities/role.entity';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
export declare class RolesService {
    private readonly roleRepo;
    constructor(roleRepo: Repository<Role>);
    findAll(): Promise<Role[]>;
    findById(id: string): Promise<Role | null>;
    findBySlug(slug: string): Promise<Role | null>;
    findByIdOrFail(id: string): Promise<Role>;
    create(dto: CreateRoleDto): Promise<Role>;
    update(id: string, dto: UpdateRoleDto): Promise<Role>;
    remove(id: string): Promise<void>;
}
