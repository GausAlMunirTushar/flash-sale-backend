import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { ReservationStatus } from '../../common/constants';

export type ReservationDocument = HydratedDocument<Reservation>;

@Schema({ timestamps: true })
export class Reservation {
  @Prop({ required: true, unique: true })
  reservationCode!: string;

  @Prop({ type: Types.ObjectId, ref: 'Seat', required: true, index: true })
  seatId!: Types.ObjectId;

  @Prop({ required: true })
  seatNumber!: string;

  @Prop({ required: true, index: true })
  userId!: string;

  @Prop({
    required: true,
    enum: ReservationStatus,
    default: ReservationStatus.LOCKED,
    index: true,
  })
  status!: ReservationStatus;

  @Prop({ type: Date, default: null, index: true })
  expiresAt!: Date | null;

  @Prop({ type: Date, default: null })
  paidAt!: Date | null;

  createdAt!: Date;
  updatedAt!: Date;
}

export const ReservationSchema = SchemaFactory.createForClass(Reservation);

ReservationSchema.index({ status: 1, expiresAt: 1 });
ReservationSchema.index({ userId: 1, status: 1 });
