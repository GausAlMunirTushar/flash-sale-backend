import {
  ConflictException,
  GoneException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { ExpiryService } from '../common/expiry.service';
import { ReservationStatus } from '../common/constants';
import { SeatsService } from '../seats/seats.service';
import { ReservationResponseDto } from './dto/reservation-response.dto';
import { Reservation, ReservationDocument } from './schemas/reservation.schema';

@Injectable()
export class ReservationsService {
  constructor(
    @InjectModel(Reservation.name)
    private readonly reservationModel: Model<ReservationDocument>,
    private readonly expiryService: ExpiryService,
    private readonly seatsService: SeatsService,
    private readonly configService: ConfigService,
  ) {}

  async reserve(
    userId: string,
    seatId: string,
  ): Promise<ReservationResponseDto> {
    await this.expiryService.releaseExpired();

    const active = await this.reservationModel.findOne({
      userId,
      status: ReservationStatus.LOCKED,
    });
    if (active) {
      throw new ConflictException('You already have an active reservation');
    }

    const holdSeconds = this.configService.get<number>(
      'reservationHoldSeconds',
      300,
    );
    const now = new Date();
    const expiresAt = new Date(now.getTime() + holdSeconds * 1000);
    const reservationId = new Types.ObjectId();

    const lockedSeat = await this.seatsService.lockSeat(
      new Types.ObjectId(seatId),
      userId,
      reservationId,
      expiresAt,
    );

    if (!lockedSeat) {
      throw new ConflictException('Seat already reserved');
    }

    const reservation = await this.reservationModel.create({
      _id: reservationId,
      reservationCode: generateReservationCode(),
      seatId: lockedSeat._id,
      seatNumber: lockedSeat.seatNumber,
      userId,
      status: ReservationStatus.LOCKED,
      expiresAt,
      paidAt: null,
    });

    return toReservationResponse(reservation);
  }

  async findMine(userId: string): Promise<ReservationResponseDto | null> {
    await this.expiryService.releaseExpired();

    const reservation = await this.reservationModel
      .findOne({ userId })
      .sort({ createdAt: -1 });
    return reservation ? toReservationResponse(reservation) : null;
  }

  async cancel(userId: string, reservationId: string): Promise<void> {
    await this.expiryService.releaseExpired();

    const reservation = await this.reservationModel.findOneAndUpdate(
      {
        _id: new Types.ObjectId(reservationId),
        userId,
        status: ReservationStatus.LOCKED,
      },
      { $set: { status: ReservationStatus.CANCELLED } },
    );

    if (!reservation) {
      throw new NotFoundException('Active reservation not found');
    }

    await this.seatsService.releaseSeat(reservation.seatId);
  }

  async pay(
    userId: string,
    reservationId: string,
  ): Promise<ReservationResponseDto> {
    await this.expiryService.releaseExpired();

    const reservation = await this.reservationModel.findOne({
      _id: new Types.ObjectId(reservationId),
      userId,
    });

    if (!reservation) {
      throw new NotFoundException('Reservation not found');
    }
    if (reservation.status === ReservationStatus.EXPIRED) {
      throw new GoneException('Reservation expired');
    }
    if (reservation.status !== ReservationStatus.LOCKED) {
      throw new ConflictException('Reservation is not awaiting payment');
    }

    const paidAt = new Date();
    const updated = await this.reservationModel.findOneAndUpdate(
      { _id: reservation._id, status: ReservationStatus.LOCKED },
      { $set: { status: ReservationStatus.PAID, paidAt } },
      { new: true },
    );

    if (!updated) {
      throw new ConflictException('Reservation is not awaiting payment');
    }

    await this.seatsService.markPurchased(reservation.seatId);
    return toReservationResponse(updated);
  }
}

function generateReservationCode(): string {
  return `RSV-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
}

function toReservationResponse(
  reservation: ReservationDocument,
): ReservationResponseDto {
  return {
    id: reservation._id.toString(),
    reservationCode: reservation.reservationCode,
    seatId: reservation.seatId.toString(),
    seatNumber: reservation.seatNumber,
    status: reservation.status,
    expiresAt: reservation.expiresAt,
    paidAt: reservation.paidAt,
    createdAt: reservation.createdAt,
  };
}
