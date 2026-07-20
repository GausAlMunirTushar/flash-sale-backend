import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Db, ObjectId } from 'mongodb';
import { MONGO_DB } from '../database/database.module';
import { ExpiryService } from '../common/expiry.service';
import { SEATS_COLLECTION, SeatStatus } from '../common/constants';
import {
  SeatResponseDto,
  SeatStatisticsResponseDto,
} from './dto/seat-response.dto';
import type { SeatDocument } from './seat.types';

const SEAT_ROWS = ['A', 'B', 'C', 'D', 'E'];
const SEATS_PER_ROW = 10;

@Injectable()
export class SeatsService implements OnModuleInit {
  private readonly logger = new Logger(SeatsService.name);

  constructor(
    @Inject(MONGO_DB) private readonly db: Db,
    private readonly expiryService: ExpiryService,
  ) {}

  private get collection() {
    return this.db.collection<SeatDocument>(SEATS_COLLECTION);
  }

  async onModuleInit(): Promise<void> {
    const count = await this.collection.countDocuments();
    if (count > 0) return;

    const now = new Date();
    const seats: SeatDocument[] = [];
    for (const row of SEAT_ROWS) {
      for (let number = 1; number <= SEATS_PER_ROW; number += 1) {
        seats.push({
          _id: new ObjectId(),
          seatNumber: `${row}-${number}`,
          row,
          number,
          status: SeatStatus.AVAILABLE,
          lockedBy: null,
          reservationId: null,
          expiresAt: null,
          createdAt: now,
          updatedAt: now,
        });
      }
    }

    await this.collection.insertMany(seats);
    this.logger.log(`Seeded ${seats.length} seats`);
  }

  async findAll(): Promise<SeatResponseDto[]> {
    await this.expiryService.releaseExpired();
    const seats = await this.collection
      .find()
      .sort({ row: 1, number: 1 })
      .toArray();
    return seats.map(toSeatResponse);
  }

  async getStatistics(): Promise<SeatStatisticsResponseDto> {
    await this.expiryService.releaseExpired();

    const [total, available, locked, sold] = await Promise.all([
      this.collection.countDocuments(),
      this.collection.countDocuments({ status: SeatStatus.AVAILABLE }),
      this.collection.countDocuments({ status: SeatStatus.LOCKED }),
      this.collection.countDocuments({ status: SeatStatus.PURCHASED }),
    ]);

    return { total, available, locked, sold };
  }

  async findById(seatId: ObjectId): Promise<SeatDocument | null> {
    return this.collection.findOne({ _id: seatId });
  }

  /** The single atomic query that prevents overbooking. */
  async lockSeat(
    seatId: ObjectId,
    userId: string,
    reservationId: ObjectId,
    expiresAt: Date,
  ): Promise<SeatDocument | null> {
    return this.collection.findOneAndUpdate(
      { _id: seatId, status: SeatStatus.AVAILABLE },
      {
        $set: {
          status: SeatStatus.LOCKED,
          lockedBy: userId,
          reservationId,
          expiresAt,
          updatedAt: new Date(),
        },
      },
      { returnDocument: 'after' },
    );
  }

  async releaseSeat(seatId: ObjectId): Promise<void> {
    await this.collection.updateOne(
      { _id: seatId, status: SeatStatus.LOCKED },
      {
        $set: {
          status: SeatStatus.AVAILABLE,
          lockedBy: null,
          reservationId: null,
          expiresAt: null,
          updatedAt: new Date(),
        },
      },
    );
  }

  async markPurchased(seatId: ObjectId): Promise<void> {
    await this.collection.updateOne(
      { _id: seatId, status: SeatStatus.LOCKED },
      {
        $set: {
          status: SeatStatus.PURCHASED,
          expiresAt: null,
          updatedAt: new Date(),
        },
      },
    );
  }
}

function toSeatResponse(seat: SeatDocument): SeatResponseDto {
  return {
    id: seat._id.toString(),
    seatNumber: seat.seatNumber,
    row: seat.row,
    number: seat.number,
    status: seat.status,
    expiresAt: seat.expiresAt,
  };
}
