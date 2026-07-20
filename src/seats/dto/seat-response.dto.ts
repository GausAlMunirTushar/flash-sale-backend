import { ApiProperty } from '@nestjs/swagger';
import { SeatStatus } from '../../common/constants';

export class SeatResponseDto {
  @ApiProperty({ example: '65f0a1b2c3d4e5f6a7b8c9d0' })
  id: string;

  @ApiProperty({ example: 'A-1' })
  seatNumber: string;

  @ApiProperty({ example: 'A' })
  row: string;

  @ApiProperty({ example: 1 })
  number: number;

  @ApiProperty({ enum: SeatStatus, example: SeatStatus.AVAILABLE })
  status: SeatStatus;

  @ApiProperty({ example: null, nullable: true })
  expiresAt: Date | null;
}

export class SeatStatisticsResponseDto {
  @ApiProperty({ example: 50 })
  total: number;

  @ApiProperty({ example: 32 })
  available: number;

  @ApiProperty({ example: 8 })
  locked: number;

  @ApiProperty({ example: 10 })
  sold: number;
}
