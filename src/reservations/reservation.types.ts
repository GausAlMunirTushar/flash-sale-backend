import { ObjectId } from 'mongodb';
import { ReservationStatus } from '../common/constants';

export interface ReservationDocument {
  _id: ObjectId;
  reservationCode: string;
  seatId: ObjectId;
  seatNumber: string;
  userId: string;
  status: ReservationStatus;
  expiresAt: Date | null;
  paidAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}
