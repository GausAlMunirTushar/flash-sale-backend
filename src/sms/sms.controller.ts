import { Controller, Get, Logger, Query } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { SmsService } from './sms.service';

@ApiTags('sms')
@Controller('sms')
export class SmsController {
  private readonly logger = new Logger(SmsController.name);

  constructor(private readonly smsService: SmsService) {}

  @Get('test')
  @ApiOperation({
    summary: 'Test SMS by sending a message to a given phone number',
  })
  @ApiQuery({ name: 'phone', example: '01726814131' })
  @ApiQuery({
    name: 'message',
    required: false,
    example: 'Test SMS from backend',
  })
  async test(
    @Query('phone') phone: string,
    @Query('message') message?: string,
  ) {
    this.logger.log(`SMS test requested for phone=${phone}`);

    const result = await this.smsService.send(
      phone,
      message ||
        `Test SMS from FlashSeat backend at ${new Date().toISOString()}`,
    );

    this.logger.log(`SMS test result: ${JSON.stringify(result)}`);
    return result;
  }
}
