import { Injectable, Logger } from '@nestjs/common';

/**
 * Provider behaviour the simulator forces (DEV/TEST ONLY):
 *  - off:         use the real IntouchPay gateway (default)
 *  - slow:        respond after `delayMs` then succeed (exercises latency logging
 *                 + the frontend "taking longer" state while still resolving)
 *  - timeout:     never usable in time → the timeout/degraded PENDING path
 *  - unavailable: provider down → network-error/degraded PENDING path
 *  - success:     instant SUCCESSFUL
 *  - fail:        instant FAILED (insufficient funds)
 */
export type SimulatorMode = 'off' | 'slow' | 'timeout' | 'unavailable' | 'success' | 'fail';

const MODES: SimulatorMode[] = ['off', 'slow', 'timeout', 'unavailable', 'success', 'fail'];

/**
 * In-memory switch to force provider conditions for testing. Never active in
 * production (the controller that mutates it hard-refuses when NODE_ENV is
 * 'production', and the real gateway is used whenever mode === 'off').
 */
@Injectable()
export class PaymentSimulatorService {
  private readonly logger = new Logger(PaymentSimulatorService.name);

  private mode: SimulatorMode = this.envMode();
  private delayMs = Number(process.env.PAYMENT_SIMULATE_DELAY_MS) || 6000;

  private envMode(): SimulatorMode {
    const m = (process.env.PAYMENT_SIMULATE_MODE ?? 'off') as SimulatorMode;
    return MODES.includes(m) ? m : 'off';
  }

  isActive(): boolean {
    return this.mode !== 'off';
  }

  get state(): { mode: SimulatorMode; delayMs: number; active: boolean } {
    return { mode: this.mode, delayMs: this.delayMs, active: this.isActive() };
  }

  static isValidMode(m: string): m is SimulatorMode {
    return MODES.includes(m as SimulatorMode);
  }

  set(mode: SimulatorMode, delayMs?: number): void {
    this.mode = mode;
    if (typeof delayMs === 'number' && delayMs >= 0) this.delayMs = delayMs;
    this.logger.warn(
      `[PaymentSimulator] mode set to "${this.mode}" (delayMs=${this.delayMs}) — DEV/TEST ONLY`,
    );
  }
}
