import {
  ConflictException,
  GoneException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import crypto from 'crypto';
import { Model, Types } from 'mongoose';
import { ActivityService } from '../activity/activity.service';
import { ExpiryService } from '../common/expiry.service';
import { ReservationStatus, SeatStatus } from '../common/constants';
import { SeatsService } from '../seats/seats.service';
import { SmsService } from '../sms/sms.service';
import { UserProfileService } from '../user-profile/user-profile.service';
import { ReservationResponseDto } from './dto/reservation-response.dto';
import { Reservation, ReservationDocument } from './schemas/reservation.schema';

@Injectable()
export class ReservationsService {
  private readonly logger = new Logger(ReservationsService.name);

  constructor(
    @InjectModel(Reservation.name)
    private readonly reservationModel: Model<ReservationDocument>,
    private readonly expiryService: ExpiryService,
    private readonly seatsService: SeatsService,
    private readonly configService: ConfigService,
    private readonly activityService: ActivityService,
    private readonly smsService: SmsService,
    private readonly userProfileService: UserProfileService,
  ) {}

  async reserve(
    userId: string,
    seatId: string,
    clientInfo?: { ip: string; userAgent: string; isGuest: boolean },
    phone?: string,
  ): Promise<ReservationResponseDto> {
    await this.expiryService.releaseExpired();

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

    try {
      const reservation = await this.reservationModel.create({
        _id: reservationId,
        reservationCode: generateReservationCode(),
        seatId: lockedSeat._id,
        seatNumber: lockedSeat.seatNumber,
        userId,
        status: ReservationStatus.LOCKED,
        expiresAt,
        paidAt: null,
        userIp: clientInfo?.ip ?? null,
        userAgent: clientInfo?.userAgent ?? null,
        isGuest: clientInfo?.isGuest ?? true,
        phone: phone ?? null,
      });

      if (phone) {
        await this.userProfileService.setPhone(userId, phone);
      }

      await this.activityService.log({
        userId,
        action: 'RESERVATION_CREATE',
        ip: clientInfo?.ip,
        userAgent: clientInfo?.userAgent,
        isGuest: clientInfo?.isGuest ?? true,
        seatId: lockedSeat._id,
        reservationId: reservation._id,
      });

      return toReservationResponse(reservation);
    } catch (err: unknown) {
      const mongoErr = err as { code?: number };
      if (mongoErr?.code === 11000) {
        await this.seatsService.releaseSeat(lockedSeat._id);
        throw new ConflictException('You already have an active reservation');
      }
      await this.seatsService.releaseSeat(lockedSeat._id);
      this.logger.error(`Reservation creation failed`, (err as Error)?.stack);
      throw new InternalServerErrorException('Failed to create reservation');
    }
  }

  async findMine(userId: string): Promise<ReservationResponseDto | null> {
    await this.expiryService.releaseExpired();

    const reservation = await this.reservationModel
      .findOne({
        userId,
        status: { $in: [ReservationStatus.LOCKED, ReservationStatus.PAID] },
      })
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

    await this.activityService.log({
      userId,
      action: 'RESERVATION_CANCEL',
      isGuest: false,
      reservationId: reservation._id,
      seatId: reservation.seatId,
    });
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

    await this.activityService.log({
      userId,
      action: 'PAYMENT_COMPLETE',
      isGuest: false,
      reservationId: reservation._id,
      seatId: reservation.seatId,
    });

    const phone =
      reservation.phone || (await this.userProfileService.getPhone(userId));
    if (phone) {
      this.smsService
        .sendPurchaseConfirmation(
          phone,
          updated.seatNumber,
          updated.reservationCode,
        )
        .catch((err: unknown) =>
          this.logger.warn(
            `SMS failed for ${phone} — payment succeeded: ${(err as Error).message}`,
          ),
        );
    }

    return toReservationResponse(updated);
  }

  async reconcileInconsistencies(): Promise<number> {
    const paidReservations = await this.reservationModel.find({
      status: ReservationStatus.PAID,
    });

    let fixed = 0;
    for (const reservation of paidReservations) {
      const seat = await this.seatsService.findById(reservation.seatId);
      if (!seat) {
        this.logger.warn(
          `Orphaned reservation ${String(reservation._id)} — seat ${String(reservation.seatId)} not found`,
        );
        continue;
      }
      if (seat.status === SeatStatus.LOCKED) {
        await this.seatsService.markPurchased(reservation.seatId);
        this.logger.log(
          `Reconciled reservation ${String(reservation._id)}: seat ${String(reservation.seatId)} was LOCKED but reservation is PAID`,
        );
        fixed++;
      }
    }
    return fixed;
  }
}

function generateReservationCode(): string {
  return `RSV-${crypto.randomUUID().slice(0, 6).toUpperCase()}`;
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
    userIp: reservation.userIp,
    userAgent: reservation.userAgent,
    isGuest: reservation.isGuest,
    phone: reservation.phone,
    createdAt: reservation.createdAt,
  };
}
