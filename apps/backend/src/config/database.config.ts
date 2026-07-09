import { registerAs } from '@nestjs/config';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';

export default registerAs(
  'database',
  (): TypeOrmModuleOptions => ({
    type: 'postgres',
    url: process.env.DATABASE_URL,
    entities: [__dirname + '/../**/*.entity.{js,ts}'],
    migrations: [__dirname + '/../database/migrations/*.{js,ts}'],
    migrationsRun: false,
    synchronize: false,
    logging: process.env.NODE_ENV === 'production' ? ['error', 'warn'] : ['error'],
    ssl:
      process.env.DATABASE_SSL === 'true' || process.env.NODE_ENV === 'production'
        ? { rejectUnauthorized: false }
        : false,
    extra: { max: 10 },
  }),
);
