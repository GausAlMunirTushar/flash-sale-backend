import {
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  User,
  UserDocument,
  UserRole,
  UserStatus,
} from './schemas/user.schema';

@Injectable()
export class UserService {
  private readonly logger = new Logger(UserService.name);

  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
  ) {}

  async findOrCreate(authId: string): Promise<UserDocument> {
    const existing = await this.userModel.findOne({ authId });
    if (existing) return existing;

    return this.userModel.create({ authId });
  }

  async findByAuthId(authId: string): Promise<UserDocument | null> {
    return this.userModel.findOne({ authId });
  }

  async findByPhone(phone: string): Promise<UserDocument | null> {
    return this.userModel.findOne({ phone });
  }

  async getPhone(authId: string): Promise<string | null> {
    const user = await this.userModel.findOne({ authId });
    return user?.phone ?? null;
  }

  async setPhone(authId: string, phone: string): Promise<void> {
    const existing = await this.userModel.findOne({
      phone,
      authId: { $ne: authId },
    });
    if (existing) {
      throw new ConflictException('Phone number already in use');
    }

    await this.userModel.updateOne(
      { authId },
      { $set: { authId, phone } },
      { upsert: true },
    );
    this.logger.log(`Phone updated for ${authId}: ${phone}`);
  }

  async recordLogin(
    authId: string,
    ip: string,
    userAgent: string,
  ): Promise<void> {
    await this.userModel.updateOne(
      { authId },
      {
        $set: {
          lastLoginAt: new Date(),
          lastIp: ip,
          lastUserAgent: userAgent,
        },
      },
      { upsert: true },
    );
  }

  async updateLastReservation(
    authId: string,
    reservationId: Types.ObjectId,
  ): Promise<void> {
    await this.userModel.updateOne(
      { authId },
      { $set: { lastReservationId: reservationId } },
    );
  }

  async updateRole(authId: string, role: UserRole): Promise<UserDocument> {
    const user = await this.userModel.findOneAndUpdate(
      { authId },
      { $set: { role } },
      { new: true },
    );
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async toggleStatus(
    authId: string,
    status: UserStatus,
  ): Promise<UserDocument> {
    const user = await this.userModel.findOneAndUpdate(
      { authId },
      { $set: { status } },
      { new: true },
    );
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async findAll(
    page = 1,
    limit = 20,
  ): Promise<{ users: UserDocument[]; total: number }> {
    const [users, total] = await Promise.all([
      this.userModel
        .find()
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      this.userModel.countDocuments(),
    ]);
    return { users, total };
  }

  async findByRole(role: UserRole): Promise<UserDocument[]> {
    return this.userModel.find({ role }).sort({ createdAt: -1 });
  }
}
