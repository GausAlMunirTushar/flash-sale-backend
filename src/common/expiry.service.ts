import { Inject, Injectable } from '@nestjs/common';
import { Db } from 'mongodb';
import { MONGO_DB } from '../database/database.module';
import type { ReservationDocument } from '../reservations/reservation.types';
import {
  RESERVATIONS_COLLECTION,
  ReservationStatus,
  SEATS_COLLECTION,
  SeatStatus,
} from './constants';

/**
 * plan.md forbids setTimeout/cron/BullMQ/Redis for expiration. Instead, every
 * read path that touches seats or reservations calls this first: any LOCKED
 * reservation whose expiresAt has passed is flipped to EXPIRED and its seat
 * released back to AVAILABLE before the caller sees the data.
 */
@Injectable()
export class ExpiryService {
  constructor(@Inject(MONGO_DB) private readonly db: Db) {}

  async releaseExpired(): Promise<void> {
    const now = new Date();
    const expired = this.db
      .collection<ReservationDocument>(RESERVATIONS_COLLECTION)
      .find({ status: ReservationStatus.LOCKED, expiresAt: { $lt: now } });

    for await (const reservation of expired) {
      await this.db
        .collection(RESERVATIONS_COLLECTION)
        .updateOne(
          { _id: reservation._id, status: ReservationStatus.LOCKED },
          { $set: { status: ReservationStatus.EXPIRED, updatedAt: now } },
        );

      await this.db.collection(SEATS_COLLECTION).updateOne(
        { _id: reservation.seatId, status: SeatStatus.LOCKED },
        {
          $set: {
            status: SeatStatus.AVAILABLE,
            lockedBy: null,
            reservationId: null,
            expiresAt: null,
            updatedAt: now,
          },
        },
      );
    }
  }
}
