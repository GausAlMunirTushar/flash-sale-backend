import { Controller, Get, Post, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { BetterAuthGuard } from '../auth/better-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { ClientInfo } from '../common/decorators/client-info.decorator';
import type { ClientInfo as ClientInfoType } from '../common/decorators/client-info.decorator';
import { ActivityService } from '../activity/activity.service';

@ApiTags('guest')
@Controller('guest')
export class GuestController {
  constructor(private readonly activityService: ActivityService) {}

  @Post('init')
  @UseGuards(BetterAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Initialize or refresh guest session' })
  @ApiOkResponse({ description: 'Guest session acknowledged' })
  async init(
    @CurrentUser() user: { id: string },
    @ClientInfo() clientInfo: ClientInfoType,
  ) {
    await this.activityService.log({
      userId: user.id,
      action: 'GUEST_INIT',
      ip: clientInfo.ip,
      userAgent: clientInfo.userAgent,
      isGuest: clientInfo.isGuest,
    });
    return { guestId: user.id, isGuest: clientInfo.isGuest };
  }

  @Get('me')
  @UseGuards(BetterAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current guest/user info' })
  @ApiOkResponse({ description: 'Current session info' })
  me(@CurrentUser() user: { id: string }) {
    return { userId: user.id };
  }
}
