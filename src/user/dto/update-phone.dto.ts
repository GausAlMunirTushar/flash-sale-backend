import { ApiProperty } from '@nestjs/swagger';
import { IsString, Matches } from 'class-validator';

export class UpdatePhoneDto {
  @ApiProperty({ example: '01726XXXXXX' })
  @IsString()
  @Matches(/^01\d{9}$/, {
    message: 'Phone must be a valid 11-digit BD number starting with 01',
  })
  phone: string;
}
