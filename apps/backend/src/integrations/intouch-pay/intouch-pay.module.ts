import { Module } from '@nestjs/common';
import { IntouchPayService } from './intouch-pay.service';

@Module({
  providers: [IntouchPayService],
  exports: [IntouchPayService],
})
export class IntouchPayModule {}
