import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  ActivityLog,
  ActivityLogDocument,
  ActivityAction,
} from './schemas/activity-log.schema';

@Injectable()
export class ActivityService {
  constructor(
    @InjectModel(ActivityLog.name)
    private readonly activityModel: Model<ActivityLogDocument>,
  ) {}

  async log(params: {
    userId: string;
    action: ActivityAction;
    ip?: string;
    userAgent?: string;
    isGuest?: boolean;
    reservationId?: Types.ObjectId;
    seatId?: Types.ObjectId;
    metadata?: Record<string, unknown>;
  }): Promise<void> {
    await this.activityModel.create({
      userId: params.userId,
      action: params.action,
      ip: params.ip ?? null,
      userAgent: params.userAgent ?? null,
      isGuest: params.isGuest ?? true,
      reservationId: params.reservationId ?? null,
      seatId: params.seatId ?? null,
      metadata: params.metadata ?? null,
    });
  }

  async findByUser(userId: string, limit = 50): Promise<ActivityLogDocument[]> {
    return this.activityModel
      .find({ userId })
      .sort({ createdAt: -1 })
      .limit(limit);
  }
}
