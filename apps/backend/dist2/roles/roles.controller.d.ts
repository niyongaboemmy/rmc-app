import { RolesService } from './roles.service';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { Role } from './entities/role.entity';
export declare class RolesController {
    private readonly rolesService;
    constructor(rolesService: RolesService);
    listPermissions(): string[];
    findAll(): Promise<Role[]>;
    findOne(id: string): Promise<Role>;
    create(dto: CreateRoleDto): Promise<Role>;
    update(id: string, dto: UpdateRoleDto): Promise<Role>;
    remove(id: string): Promise<void>;
}
