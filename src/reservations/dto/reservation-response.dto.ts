import { ApiProperty } from '@nestjs/swagger';
import { ReservationStatus } from '../../common/constants';

export class ReservationResponseDto {
  @ApiProperty({ example: '65f0a1b2c3d4e5f6a7b8c9d1' })
  id: string;

  @ApiProperty({ example: 'RSV-4F8K2A' })
  reservationCode: string;

  @ApiProperty({ example: '65f0a1b2c3d4e5f6a7b8c9d0' })
  seatId: string;

  @ApiProperty({ example: 'A-1' })
  seatNumber: string;

  @ApiProperty({ enum: ReservationStatus, example: ReservationStatus.LOCKED })
  status: ReservationStatus;

  @ApiProperty({ example: '2026-07-20T10:29:30.000Z', nullable: true })
  expiresAt: Date | null;

  @ApiProperty({ example: null, nullable: true })
  paidAt: Date | null;

  @ApiProperty({ example: '2026-07-20T10:24:30.000Z' })
  createdAt: Date;
}
