import { UsersService, UserListQuery } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto, AssignRoleDto } from './dto/update-user.dto';
import { User } from './entities/user.entity';
export declare class UsersController {
    private readonly usersService;
    constructor(usersService: UsersService);
    findAll(query: UserListQuery): Promise<{
        users: User[];
        total: number;
    }>;
    getMe(user: User): Promise<User | null>;
    findOne(id: string): Promise<User | null>;
    create(dto: CreateUserDto): Promise<User>;
    update(id: string, dto: UpdateUserDto): Promise<User>;
    assignRole(id: string, dto: AssignRoleDto): Promise<User>;
    remove(id: string): Promise<void>;
}
