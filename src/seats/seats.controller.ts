import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { SeatsService } from './seats.service';
import {
  SeatResponseDto,
  SeatStatisticsResponseDto,
} from './dto/seat-response.dto';

@ApiTags('seats')
@Controller('seats')
export class SeatsController {
  constructor(private readonly seatsService: SeatsService) {}

  @Get()
  @ApiOperation({ summary: 'List all 50 seats with their current status' })
  @ApiOkResponse({ type: SeatResponseDto, isArray: true })
  findAll(): Promise<SeatResponseDto[]> {
    return this.seatsService.findAll();
  }

  @Get('statistics')
  @ApiOperation({ summary: 'Seat counts by status' })
  @ApiOkResponse({ type: SeatStatisticsResponseDto })
  getStatistics(): Promise<SeatStatisticsResponseDto> {
    return this.seatsService.getStatistics();
  }
}
