import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { ExpiryService } from '../common/expiry.service';
import { SeatStatus } from '../common/constants';
import { Seat, SeatDocument } from './schemas/seat.schema';
import {
  SeatResponseDto,
  SeatStatisticsResponseDto,
} from './dto/seat-response.dto';

const SEAT_ROWS = ['A', 'B', 'C', 'D', 'E'];
const SEATS_PER_ROW = 10;

@Injectable()
export class SeatsService implements OnModuleInit {
  private readonly logger = new Logger(SeatsService.name);

  constructor(
    @InjectModel(Seat.name) private readonly seatModel: Model<SeatDocument>,
    private readonly expiryService: ExpiryService,
  ) {}

  async onModuleInit(): Promise<void> {
    const count = await this.seatModel.countDocuments();
    if (count > 0) return;

    const seats: Partial<Seat>[] = [];
    for (const row of SEAT_ROWS) {
      for (let number = 1; number <= SEATS_PER_ROW; number += 1) {
        seats.push({
          seatNumber: `${row}-${number}`,
          row,
          number,
          status: SeatStatus.AVAILABLE,
        });
      }
    }

    await this.seatModel.insertMany(seats);
    this.logger.log(`Seeded ${seats.length} seats`);
  }

  async findAll(): Promise<SeatResponseDto[]> {
    await this.expiryService.releaseExpired();
    const seats = await this.seatModel.find().sort({ row: 1, number: 1 });
    return seats.map(toSeatResponse);
  }

  async getStatistics(): Promise<SeatStatisticsResponseDto> {
    await this.expiryService.releaseExpired();

    const [total, available, locked, sold] = await Promise.all([
      this.seatModel.countDocuments(),
      this.seatModel.countDocuments({ status: SeatStatus.AVAILABLE }),
      this.seatModel.countDocuments({ status: SeatStatus.LOCKED }),
      this.seatModel.countDocuments({ status: SeatStatus.PURCHASED }),
    ]);

    return { total, available, locked, sold };
  }

  async findById(seatId: Types.ObjectId): Promise<SeatDocument | null> {
    return this.seatModel.findById(seatId);
  }

  /** The single atomic query that prevents overbooking. */
  async lockSeat(
    seatId: Types.ObjectId,
    userId: string,
    reservationId: Types.ObjectId,
    expiresAt: Date,
  ): Promise<SeatDocument | null> {
    return this.seatModel.findOneAndUpdate(
      { _id: seatId, status: SeatStatus.AVAILABLE },
      {
        $set: {
          status: SeatStatus.LOCKED,
          lockedBy: userId,
          reservationId,
          expiresAt,
        },
      },
      { new: true },
    );
  }

  async releaseSeat(seatId: Types.ObjectId): Promise<void> {
    await this.seatModel.updateOne(
      { _id: seatId, status: SeatStatus.LOCKED },
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

  async markPurchased(seatId: Types.ObjectId): Promise<void> {
    await this.seatModel.updateOne(
      { _id: seatId, status: SeatStatus.LOCKED },
      { $set: { status: SeatStatus.PURCHASED, expiresAt: null } },
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
