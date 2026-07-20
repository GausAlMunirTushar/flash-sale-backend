import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { BetterAuthGuard } from '../auth/better-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { ReservationResponseDto } from '../reservations/dto/reservation-response.dto';
import { ReservationsService } from '../reservations/reservations.service';
import { MockPaymentDto } from './dto/mock-payment.dto';

@ApiTags('payments')
@ApiBearerAuth()
@UseGuards(BetterAuthGuard)
@Controller('payments')
export class PaymentsController {
  constructor(private readonly reservationsService: ReservationsService) {}

  @Post('mock')
  @ApiOperation({ summary: 'Complete a mock payment for a locked reservation' })
  @ApiOkResponse({ type: ReservationResponseDto })
  pay(
    @CurrentUser() user: { id: string },
    @Body() dto: MockPaymentDto,
  ): Promise<ReservationResponseDto> {
    return this.reservationsService.pay(user.id, dto.reservationId);
  }
}
