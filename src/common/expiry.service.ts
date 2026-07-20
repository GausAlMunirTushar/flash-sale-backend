import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  Reservation,
  ReservationDocument,
} from '../reservations/schemas/reservation.schema';
import { Seat, SeatDocument } from '../seats/schemas/seat.schema';
import { ReservationStatus, SeatStatus } from './constants';

/**
 * plan.md forbids setTimeout/cron/BullMQ/Redis for expiration. Instead, every
 * read path that touches seats or reservations calls this first: any LOCKED
 * reservation whose expiresAt has passed is flipped to EXPIRED and its seat
 * released back to AVAILABLE before the caller sees the data.
 */
@Injectable()
export class ExpiryService {
  constructor(
    @InjectModel(Reservation.name)
    private readonly reservationModel: Model<ReservationDocument>,
    @InjectModel(Seat.name) private readonly seatModel: Model<SeatDocument>,
  ) {}

  async releaseExpired(): Promise<void> {
    const now = new Date();
    const expired = await this.reservationModel.find({
      status: ReservationStatus.LOCKED,
      expiresAt: { $lt: now },
    });

    for (const reservation of expired) {
      await this.reservationModel.updateOne(
        { _id: reservation._id, status: ReservationStatus.LOCKED },
        { $set: { status: ReservationStatus.EXPIRED } },
      );

      await this.seatModel.updateOne(
        { _id: reservation.seatId, status: SeatStatus.LOCKED },
        {
          $set: {
            status: SeatStatus.AVAILABLE,
            lockedBy: null,
            reservationId: null,
            expiresAt: null,
          },
        },
      );
    }
  }
}
