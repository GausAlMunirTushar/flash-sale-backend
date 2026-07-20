import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type UserProfileDocument = HydratedDocument<UserProfile>;

@Schema({ timestamps: true })
export class UserProfile {
  @Prop({ required: true, unique: true, index: true })
  userId!: string;

  @Prop({ type: String, default: null })
  phone!: string | null;

  createdAt!: Date;
  updatedAt!: Date;
}

export const UserProfileSchema = SchemaFactory.createForClass(UserProfile);
