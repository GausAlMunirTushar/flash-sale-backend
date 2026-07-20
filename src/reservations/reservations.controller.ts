import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { BetterAuthGuard } from '../auth/better-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { CreateReservationDto } from './dto/create-reservation.dto';
import { ReservationResponseDto } from './dto/reservation-response.dto';
import { ReservationsService } from './reservations.service';

@ApiTags('reservations')
@ApiBearerAuth()
@UseGuards(BetterAuthGuard)
@Controller('reservations')
export class ReservationsController {
  constructor(private readonly reservationsService: ReservationsService) {}

  @Post()
  @ApiOperation({ summary: 'Reserve a seat for 5 minutes' })
  @ApiOkResponse({ type: ReservationResponseDto })
  reserve(
    @CurrentUser() user: { id: string },
    @Body() dto: CreateReservationDto,
  ): Promise<ReservationResponseDto> {
    return this.reservationsService.reserve(user.id, dto.seatId);
  }

  @Get('me')
  @ApiOperation({ summary: "Get the current user's most recent reservation" })
  @ApiOkResponse({ type: ReservationResponseDto })
  findMine(
    @CurrentUser() user: { id: string },
  ): Promise<ReservationResponseDto | null> {
    return this.reservationsService.findMine(user.id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Cancel an active reservation' })
  cancel(
    @CurrentUser() user: { id: string },
    @Param('id') id: string,
  ): Promise<void> {
    return this.reservationsService.cancel(user.id, id);
  }
}
