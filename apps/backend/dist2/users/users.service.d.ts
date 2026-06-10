import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
export declare class UsersService {
    private readonly userRepo;
    constructor(userRepo: Repository<User>);
    findById(id: string): Promise<User | null>;
    findByEmail(email: string): Promise<User | null>;
    findByPhone(phone: string): Promise<User | null>;
    findByEmailOrPhone(identifier: string): Promise<User | null>;
    save(user: Partial<User>): Promise<User>;
    update(id: string, data: Partial<User>): Promise<void>;
}
