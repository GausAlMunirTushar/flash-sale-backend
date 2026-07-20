import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { SeatStatus } from '../../common/constants';

export type SeatDocument = HydratedDocument<Seat>;

@Schema({ timestamps: true })
export class Seat {
  @Prop({ required: true, unique: true })
  seatNumber!: string;

  @Prop({ required: true })
  row!: string;

  @Prop({ required: true })
  number!: number;

  @Prop({
    required: true,
    enum: SeatStatus,
    default: SeatStatus.AVAILABLE,
    index: true,
  })
  status!: SeatStatus;

  @Prop({ type: String, default: null })
  lockedBy!: string | null;

  @Prop({ type: Types.ObjectId, ref: 'Reservation', default: null })
  reservationId!: Types.ObjectId | null;

  @Prop({ type: Date, default: null, index: true })
  expiresAt!: Date | null;

  createdAt!: Date;
  updatedAt!: Date;
}

export const SeatSchema = SchemaFactory.createForClass(Seat);

SeatSchema.index({ status: 1, expiresAt: 1 });
