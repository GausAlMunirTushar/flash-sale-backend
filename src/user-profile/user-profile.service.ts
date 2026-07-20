import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  UserProfile,
  UserProfileDocument,
} from './schemas/user-profile.schema';

@Injectable()
export class UserProfileService {
  constructor(
    @InjectModel(UserProfile.name)
    private readonly profileModel: Model<UserProfileDocument>,
  ) {}

  async getPhone(userId: string): Promise<string | null> {
    const profile = await this.profileModel.findOne({ userId });
    return profile?.phone ?? null;
  }

  async setPhone(userId: string, phone: string): Promise<void> {
    await this.profileModel.updateOne(
      { userId },
      { $set: { userId, phone } },
      { upsert: true },
    );
  }
}
