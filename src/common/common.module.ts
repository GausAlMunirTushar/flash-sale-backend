import { Global, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  Reservation,
  ReservationSchema,
} from '../reservations/schemas/reservation.schema';
import { Seat, SeatSchema } from '../seats/schemas/seat.schema';
import { ExpiryService } from './expiry.service';

@Global()
@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Seat.name, schema: SeatSchema },
      { name: Reservation.name, schema: ReservationSchema },
    ]),
  ],
  providers: [ExpiryService],
  exports: [ExpiryService],
})
export class CommonModule {}
