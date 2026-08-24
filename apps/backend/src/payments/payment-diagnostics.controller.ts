import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { IsIn, IsInt, IsOptional, Min } from 'class-validator';
import { Public } from '../common/decorators/public.decorator';
import { PaymentSimulatorService, SimulatorMode } from './payment-simulator.service';
import { PaymentProviderEventsService } from './payment-provider-events.service';

const SIMULATOR_MODES = ['off', 'slow', 'timeout', 'unavailable', 'success', 'fail'] as const;

class SetSimulatorDto {
  // Decorators are required — the global ValidationPipe (whitelist +
  // forbidNonWhitelisted) strips any property that isn't validated.
  @IsIn(SIMULATOR_MODES)
  mode!: SimulatorMode;

  @IsOptional()
  @IsInt()
  @Min(0)
  delayMs?: number;
}

/**
 * DEV/TEST-only endpoints to (a) force provider conditions (slow/timeout/down)
 * so payment resilience can be exercised without real MoMo credentials, and
 * (b) read the provider health summary.
 *
 * Every mutating route hard-refuses in production. Marked @Public so it can be
 * driven from a terminal/browser during local testing.
 */
@ApiTags('Payments — Diagnostics (dev)')
@Controller('dev/payment')
export class PaymentDiagnosticsController {
  constructor(
    private readonly simulator: PaymentSimulatorService,
    private readonly events: PaymentProviderEventsService,
  ) {}

  private assertNotProduction(): void {
    if (process.env.NODE_ENV === 'production') {
      // Behave as if the route doesn't exist in production.
      throw new NotFoundException();
    }
  }

  @Get('simulator')
  @Public()
  @ApiOperation({ summary: 'Read the current payment simulator mode (dev only)' })
  getSimulator() {
    this.assertNotProduction();
    return this.simulator.state;
  }

  @Post('simulator')
  @Public()
  @ApiOperation({
    summary:
      'Force provider behaviour: off | slow | timeout | unavailable | success | fail (dev only)',
  })
  setSimulator(@Body() dto: SetSimulatorDto) {
    this.assertNotProduction();
    if (!dto?.mode || !PaymentSimulatorService.isValidMode(dto.mode)) {
      throw new BadRequestException(
        'mode must be one of: off, slow, timeout, unavailable, success, fail',
      );
    }
    this.simulator.set(dto.mode, dto.delayMs);
    return this.simulator.state;
  }

  @Get('health')
  @Public()
  @ApiOperation({ summary: 'Provider timeout/latency summary over a recent window (dev only)' })
  async health(@Query('minutes') minutes?: string) {
    this.assertNotProduction();
    const win = minutes ? Math.max(1, Math.min(1440, parseInt(minutes, 10))) : 60;
    return this.events.summary(win);
  }
}
