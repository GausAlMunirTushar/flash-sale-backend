import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { BetterAuthGuard } from '../auth/better-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { UserProfileService } from './user-profile.service';

class UpdatePhoneDto {
  phone: string;
}

@ApiTags('profile')
@ApiBearerAuth()
@UseGuards(BetterAuthGuard)
@Controller('profile')
export class UserProfileController {
  constructor(private readonly profileService: UserProfileService) {}

  @Get('phone')
  @ApiOperation({ summary: 'Get saved phone number' })
  async getPhone(@CurrentUser() user: { id: string }) {
    const phone = await this.profileService.getPhone(user.id);
    return { phone };
  }

  @Post('phone')
  @ApiOperation({ summary: 'Save phone number for SMS notifications' })
  async setPhone(
    @CurrentUser() user: { id: string },
    @Body() dto: UpdatePhoneDto,
  ) {
    await this.profileService.setPhone(user.id, dto.phone);
    return { success: true };
  }
}
