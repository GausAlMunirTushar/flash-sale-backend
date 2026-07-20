import { ApiProperty } from '@nestjs/swagger';
import { IsMongoId } from 'class-validator';

export class MockPaymentDto {
  @ApiProperty({ example: '65f0a1b2c3d4e5f6a7b8c9d1' })
  @IsMongoId()
  reservationId: string;
}
