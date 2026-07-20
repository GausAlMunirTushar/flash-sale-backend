import { DynamicModule, Global, Module } from '@nestjs/common';
import { AUTH_INSTANCE } from './auth.constants';
import { BetterAuthGuard } from './better-auth.guard';
import type { Auth } from './better-auth';

@Global()
@Module({})
export class AuthModule {
  static forRoot(auth: Auth): DynamicModule {
    return {
      module: AuthModule,
      providers: [{ provide: AUTH_INSTANCE, useValue: auth }, BetterAuthGuard],
      exports: [AUTH_INSTANCE, BetterAuthGuard],
    };
  }
}
