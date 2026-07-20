import { Global, Module } from '@nestjs/common';
import { ExpiryService } from './expiry.service';

@Global()
@Module({
  providers: [ExpiryService],
  exports: [ExpiryService],
})
export class CommonModule {}
