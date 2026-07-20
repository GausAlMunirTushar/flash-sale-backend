import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  Reservation,
  ReservationDocument,
} from '../reservations/schemas/reservation.schema';
import { Seat, SeatDocument } from '../seats/schemas/seat.schema';
import { ReservationStatus, SeatStatus } from './constants';

@Injectable()
export class ExpiryService {
  private readonly logger = new Logger(ExpiryService.name);

  constructor(
    @InjectModel(Reservation.name)
    private readonly reservationModel: Model<ReservationDocument>,
    @InjectModel(Seat.name) private readonly seatModel: Model<SeatDocument>,
  ) {}

  async releaseExpired(): Promise<void> {
    const now = new Date();

    await this.reservationModel.updateMany(
      {
        status: ReservationStatus.LOCKED,
        expiresAt: { $lt: now },
      },
      { $set: { status: ReservationStatus.EXPIRED } },
    );

    const released = await this.seatModel.updateMany(
      {
        status: SeatStatus.LOCKED,
        expiresAt: { $lt: now },
      },
      {
        $set: {
          status: SeatStatus.AVAILABLE,
          lockedBy: null,
          reservationId: null,
          expiresAt: null,
        },
      },
    );

    if (released.modifiedCount > 0) {
      this.logger.log(`Released ${released.modifiedCount} expired seat(s)`);
    }
  }
}
