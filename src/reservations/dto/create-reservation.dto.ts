import { ApiProperty } from '@nestjs/swagger';
import { IsMongoId, IsNotEmpty, IsString } from 'class-validator';

export class CreateReservationDto {
  @ApiProperty({
    example: '65f0a1b2c3d4e5f6a7b8c9d0',
    description: 'Seat _id to reserve',
  })
  @IsString()
  @IsNotEmpty()
  @IsMongoId()
  seatId: string;
}
