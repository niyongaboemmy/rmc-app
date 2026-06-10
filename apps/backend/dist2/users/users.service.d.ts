import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { User } from './entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto, AssignRoleDto } from './dto/update-user.dto';
export interface UserListQuery {
    page?: number;
    limit?: number;
    search?: string;
    role?: string;
    status?: string;
}
export declare class UsersService {
    private readonly userRepo;
    private readonly configService;
    constructor(userRepo: Repository<User>, configService: ConfigService);
    findById(id: string): Promise<User | null>;
    findByIdRaw(id: string): Promise<User | null>;
    findByEmail(email: string): Promise<User | null>;
    findByPhone(phone: string): Promise<User | null>;
    findByEmailOrPhone(identifier: string): Promise<User | null>;
    findAll(query: UserListQuery): Promise<{
        users: User[];
        total: number;
    }>;
    create(dto: CreateUserDto): Promise<User>;
    updateProfile(id: string, dto: UpdateUserDto): Promise<User>;
    assignRole(id: string, dto: AssignRoleDto): Promise<User>;
    save(user: Partial<User>): Promise<User>;
    update(id: string, data: Partial<User>): Promise<void>;
    softDelete(id: string): Promise<void>;
}
