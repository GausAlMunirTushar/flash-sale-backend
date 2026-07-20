import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { BetterAuthGuard } from '../auth/better-auth.guard';
import { ClientInfo } from '../common/decorators/client-info.decorator';
import type { ClientInfo as ClientInfoType } from '../common/decorators/client-info.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import type { UserDocument } from './schemas/user.schema';
import { UserResponseDto } from './dto/user-response.dto';
import { UpdatePhoneDto } from './dto/update-phone.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { UserService } from './user.service';

function toUserResponse(user: UserDocument): UserResponseDto {
  return {
    id: user._id.toString(),
    authId: user.authId,
    phone: user.phone,
    role: user.role,
    status: user.status,
    lastLoginAt: user.lastLoginAt,
    lastIp: user.lastIp,
    lastReservationId: user.lastReservationId?.toString() ?? null,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

@ApiTags('user')
@ApiBearerAuth()
@UseGuards(BetterAuthGuard)
@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get('profile')
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiOkResponse({ type: UserResponseDto })
  async getProfile(@CurrentUser() user: { id: string }) {
    const u = await this.userService.findOrCreate(user.id);
    return toUserResponse(u);
  }

  @Put('phone')
  @ApiOperation({ summary: 'Update phone number for SMS receipts' })
  @ApiOkResponse({ type: UserResponseDto })
  async updatePhone(
    @CurrentUser() user: { id: string },
    @Body() dto: UpdatePhoneDto,
    @ClientInfo() clientInfo: ClientInfoType,
  ) {
    await this.userService.setPhone(user.id, dto.phone);
    await this.userService.recordLogin(
      user.id,
      clientInfo.ip,
      clientInfo.userAgent,
    );
    const u = await this.userService.findOrCreate(user.id);
    return toUserResponse(u);
  }

  @Get('phone')
  @ApiOperation({ summary: 'Get saved phone number' })
  async getPhone(@CurrentUser() user: { id: string }) {
    const phone = await this.userService.getPhone(user.id);
    return { phone };
  }

  @Post('login')
  @ApiOperation({ summary: 'Record login activity' })
  async recordLogin(
    @CurrentUser() user: { id: string },
    @ClientInfo() clientInfo: ClientInfoType,
  ) {
    await this.userService.recordLogin(
      user.id,
      clientInfo.ip,
      clientInfo.userAgent,
    );
    return { success: true };
  }
}

@ApiTags('admin')
@ApiBearerAuth()
@UseGuards(BetterAuthGuard)
@Controller('admin/users')
export class AdminUserController {
  constructor(private readonly userService: UserService) {}

  @Get()
  @ApiOperation({ summary: 'List all users (admin)' })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 20 })
  async findAll(@Query('page') page?: string, @Query('limit') limit?: string) {
    const result = await this.userService.findAll(
      parseInt(page ?? '1', 10),
      parseInt(limit ?? '20', 10),
    );
    return {
      users: result.users.map(toUserResponse),
      total: result.total,
    };
  }

  @Put(':authId/role')
  @ApiOperation({ summary: 'Update user role (admin)' })
  async updateRole(
    @Param('authId') authId: string,
    @Body() dto: UpdateRoleDto,
  ) {
    const user = await this.userService.updateRole(authId, dto.role);
    return toUserResponse(user);
  }
}
