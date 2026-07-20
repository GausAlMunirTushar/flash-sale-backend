import { ObjectId } from 'mongodb';
import { SeatStatus } from '../common/constants';

export interface SeatDocument {
  _id: ObjectId;
  seatNumber: string;
  row: string;
  number: number;
  status: SeatStatus;
  lockedBy: string | null;
  reservationId: ObjectId | null;
  expiresAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}
