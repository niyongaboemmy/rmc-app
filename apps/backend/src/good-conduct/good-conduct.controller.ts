import { Controller, Get, Post, Patch, Param, Body, Query, ParseUUIDPipe } from '@nestjs/common';
import { IsNotEmpty, IsString } from 'class-validator';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { GoodConductService } from './good-conduct.service';
import { CreateGoodConductRequestDto } from './dto/create-good-conduct-request.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';
import { User } from '../users/entities/user.entity';

class InitiateMomoDto {
  @IsString()
  @IsNotEmpty()
  mobilePhone: string;
}

@ApiTags('Good Conduct — Member')
@Controller('good-conduct')
export class GoodConductController {
  constructor(private readonly service: GoodConductService) {}

  @Post('requests')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a Good Conduct request draft' })
  createDraft(@CurrentUser() user: User, @Body() dto: CreateGoodConductRequestDto) {
    return this.service.createDraft(user.id, dto);
  }

  @Patch('requests/:id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a draft or more-info-requested request' })
  updateDraft(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: Partial<CreateGoodConductRequestDto>,
  ) {
    return this.service.updateDraft(id, user.id, dto);
  }

  @Get('requests')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List own Good Conduct requests' })
  listOwn(@CurrentUser() user: User, @Query('status') status?: string) {
    return this.service.listOwn(user.id, { status });
  }

  @Get('requests/:id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get own Good Conduct request details' })
  findOwn(@CurrentUser() user: User, @Param('id', ParseUUIDPipe) id: string) {
    return this.service.findOwn(id, user.id);
  }

  @Post('requests/:id/cancel')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Cancel a draft or submitted request' })
  cancel(@CurrentUser() user: User, @Param('id', ParseUUIDPipe) id: string) {
    return this.service.cancel(id, user.id);
  }

  @Post('requests/:id/pay')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Initiate MoMo payment request via IntouchPay' })
  pay(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: InitiateMomoDto,
  ) {
    return this.service.initiateMomoPayment(id, user.id, dto.mobilePhone);
  }

  @Post('requests/:id/pay/bank-notice')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Declare a bank transfer made (awaiting admin confirmation)' })
  payBankNotice(@CurrentUser() user: User, @Param('id', ParseUUIDPipe) id: string) {
    return this.service.submitBankTransferNotice(id, user.id);
  }

  @Get('requests/:id/pay/status')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Poll MoMo payment status from IntouchPay' })
  payStatus(@CurrentUser() user: User, @Param('id', ParseUUIDPipe) id: string) {
    return this.service.checkMomoPaymentStatus(id, user.id);
  }

  @Get('requests/:id/certificate-data')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get certificate render data (own request, once closed)' })
  certificateData(@CurrentUser() user: User, @Param('id', ParseUUIDPipe) id: string) {
    return this.service.getCertificateData(id, user.id);
  }

  @Get('public/verify/:certificateNumber')
  @Public()
  @ApiOperation({ summary: 'Public certificate authenticity check (no auth)' })
  publicVerify(@Param('certificateNumber') certificateNumber: string) {
    return this.service.publicVerify(certificateNumber);
  }

  @Get('public/bank-details')
  @Public()
  @ApiOperation({
    summary: 'Real, admin-configured bank transfer details (or null if not yet configured)',
  })
  bankDetails() {
    return this.service.getBankTransferDetails();
  }
}
