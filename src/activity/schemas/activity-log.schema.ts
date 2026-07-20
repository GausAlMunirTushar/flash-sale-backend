import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type ActivityLogDocument = HydratedDocument<ActivityLog>;

export type ActivityAction =
  | 'GUEST_INIT'
  | 'PAGE_VISIT'
  | 'SEAT_VIEW'
  | 'RESERVATION_CREATE'
  | 'RESERVATION_CANCEL'
  | 'RESERVATION_EXPIRE'
  | 'PAYMENT_COMPLETE'
  | 'AUTH_LOGIN'
  | 'AUTH_LOGOUT'
  | 'AUTH_REGISTER';

@Schema({ timestamps: true })
export class ActivityLog {
  @Prop({ required: true, index: true })
  userId!: string;

  @Prop({ type: String, required: true, index: true })
  action!: ActivityAction;

  @Prop({ type: String, default: null })
  ip!: string | null;

  @Prop({ type: String, default: null })
  userAgent!: string | null;

  @Prop({ type: Boolean, default: true })
  isGuest!: boolean;

  @Prop({ type: Types.ObjectId, default: null })
  reservationId!: Types.ObjectId | null;

  @Prop({ type: Types.ObjectId, default: null })
  seatId!: Types.ObjectId | null;

  @Prop({ type: Object, default: null })
  metadata!: Record<string, unknown> | null;

  createdAt!: Date;
}

export const ActivityLogSchema = SchemaFactory.createForClass(ActivityLog);

ActivityLogSchema.index({ userId: 1, createdAt: -1 });
ActivityLogSchema.index({ action: 1, createdAt: -1 });
