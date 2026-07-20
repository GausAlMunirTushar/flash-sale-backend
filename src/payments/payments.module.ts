import { Module } from '@nestjs/common';
import { ReservationsModule } from '../reservations/reservations.module';
import { PaymentsController } from './payments.controller';

@Module({
  imports: [ReservationsModule],
  controllers: [PaymentsController],
})
export class PaymentsModule {}
