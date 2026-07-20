export enum SeatStatus {
  AVAILABLE = 'AVAILABLE',
  LOCKED = 'LOCKED',
  PURCHASED = 'PURCHASED',
}

export enum ReservationStatus {
  LOCKED = 'LOCKED',
  PAID = 'PAID',
  EXPIRED = 'EXPIRED',
  CANCELLED = 'CANCELLED',
}

export const SEATS_COLLECTION = 'seats';
export const RESERVATIONS_COLLECTION = 'reservations';
