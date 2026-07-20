import { ApiProperty } from '@nestjs/swagger';
import { UserRole, UserStatus } from '../schemas/user.schema';

export class UserResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  authId: string;

  @ApiProperty({ example: '01726XXXXXX', nullable: true })
  phone: string | null;

  @ApiProperty({ enum: UserRole, example: UserRole.USER })
  role: UserRole;

  @ApiProperty({ enum: UserStatus, example: UserStatus.ACTIVE })
  status: UserStatus;

  @ApiProperty({ example: null, nullable: true })
  lastLoginAt: Date | null;

  @ApiProperty({ example: '192.168.1.1', nullable: true })
  lastIp: string | null;

  @ApiProperty({ example: null, nullable: true })
  lastReservationId: string | null;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
