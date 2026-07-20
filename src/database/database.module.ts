import { DynamicModule, Global, Module } from '@nestjs/common';
import { Db } from 'mongodb';

export const MONGO_DB = 'MONGO_DB';

@Global()
@Module({})
export class DatabaseModule {
  static forRoot(db: Db): DynamicModule {
    return {
      module: DatabaseModule,
      providers: [{ provide: MONGO_DB, useValue: db }],
      exports: [MONGO_DB],
    };
  }
}
