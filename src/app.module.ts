import { DynamicModule, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import configuration from './config/configuration';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import type { Auth } from './auth/better-auth';
import { CommonModule } from './common/common.module';
import { PaymentsModule } from './payments/payments.module';
import { ReservationsModule } from './reservations/reservations.module';
import { SeatsModule } from './seats/seats.module';

@Module({})
export class AppModule {
  static forRoot(auth: Auth): DynamicModule {
    const config = configuration();

    return {
      module: AppModule,
      imports: [
        ThrottlerModule.forRoot([{ ttl: 60000, limit: 100 }]),
        ConfigModule.forRoot({ isGlobal: true, load: [configuration] }),
        MongooseModule.forRoot(config.mongodbUri),
        AuthModule.forRoot(auth),
        CommonModule,
        SeatsModule,
        ReservationsModule,
        PaymentsModule,
      ],
      controllers: [AppController],
      providers: [AppService, { provide: APP_GUARD, useClass: ThrottlerGuard }],
    };
  }
}
