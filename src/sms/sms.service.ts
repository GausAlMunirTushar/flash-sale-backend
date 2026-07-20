import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class SmsService {
  private readonly logger = new Logger(SmsService.name);
  private readonly apiKey: string;
  private readonly senderId: string;

  constructor(private readonly configService: ConfigService) {
    this.apiKey =
      process.env.SMS_API_KEY ||
      this.configService.get<string>('smsApiKey') ||
      '';
    this.senderId =
      process.env.SMS_SENDER_ID ||
      this.configService.get<string>('smsSenderId') ||
      '';
    this.logger.log(
      `SmsService initialized — apiKey: ${this.apiKey ? '✓ set' : '✗ MISSING'}, senderId: ${this.senderId ? '✓ set' : '✗ MISSING'}`,
    );
  }

  private normalizePhone(phone: string): string {
    const digits = phone.replace(/\D/g, '');
    if (digits.startsWith('880') && digits.length > 11) {
      return digits.slice(3);
    }
    if (digits.startsWith('0') && digits.length === 11) {
      return digits;
    }
    return digits;
  }

  async send(
    phone: string,
    message: string,
  ): Promise<{ success: boolean; code?: number; raw?: string }> {
    if (!this.apiKey || !this.senderId) {
      this.logger.warn('SMS not configured — apiKey or senderId missing');
      return { success: false };
    }

    const normalized = this.normalizePhone(phone);

    try {
      const url = new URL('http://bulksmsbd.net/api/smsapi');
      url.searchParams.set('api_key', this.apiKey);
      url.searchParams.set('type', 'text');
      url.searchParams.set('number', normalized);
      url.searchParams.set('senderid', this.senderId);
      url.searchParams.set('message', message);

      const fullUrl = url.toString();
      this.logger.log(`=== SMS REQUEST ===`);
      this.logger.log(
        `URL (key hidden): http://bulksmsbd.net/api/smsapi?api_key=***&type=text&number=${normalized}&senderid=${this.senderId}&message=${message.slice(0, 40)}...`,
      );
      this.logger.log(`Phone normalized: "${phone}" → "${normalized}"`);
      this.logger.log(`Message: "${message.slice(0, 60)}..."`);

      const res = await fetch(fullUrl);
      const httpStatus = res.status;
      const text = await res.text();

      this.logger.log(`HTTP response status: ${httpStatus}`);
      this.logger.log(`Raw response body: "${text}"`);

      let data: { response_code?: number; error_message?: string };
      try {
        data = JSON.parse(text) as {
          response_code?: number;
          error_message?: string;
        };
        this.logger.log(`Parsed JSON: ${JSON.stringify(data)}`);
      } catch {
        this.logger.error(
          `SMS API returned non-JSON (status ${httpStatus}): "${text.slice(0, 300)}"`,
        );
        return { success: false, raw: text.slice(0, 300) };
      }

      if (data.response_code === 202) {
        this.logger.log(
          `✓ SMS sent successfully to ${normalized}: ${message.slice(0, 40)}...`,
        );
        return { success: true, code: data.response_code, raw: text };
      }

      this.logger.warn(
        `✗ SMS failed for ${normalized}: code=${data.response_code}, error="${data.error_message || 'N/A'}"`,
      );
      if (data.response_code === 1032) {
        this.logger.warn(
          `→ ERROR 1032: IP not whitelisted. Your server's outbound IP needs to be added to BulkSMSBD whitelist.`,
        );
      }
      return { success: false, code: data.response_code, raw: text };
    } catch (err) {
      this.logger.error(
        `✗ SMS exception for ${phone}: ${(err as Error).message}`,
      );
      this.logger.error(`Stack: ${(err as Error).stack}`);
      return { success: false };
    }
  }

  async sendPurchaseConfirmation(
    phone: string,
    seatNumber: string,
    code: string,
  ): Promise<void> {
    const message = `Your seat ${seatNumber} is confirmed! Code: ${code}. Thank you for your purchase.`;
    this.logger.log(
      `sendPurchaseConfirmation called — phone=${phone}, seat=${seatNumber}, code=${code}`,
    );
    await this.send(phone, message);
  }
}
