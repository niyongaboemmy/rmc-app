import { BadRequestException, NotFoundException } from '@nestjs/common';
import { PaymentDiagnosticsController } from './payment-diagnostics.controller';
import { PaymentSimulatorService } from './payment-simulator.service';

/**
 * The dev-only diagnostics surface, relocated out of the IntouchPay folder.
 *
 * Every route here is `@Public()` and the simulator can force a payment to
 * report success without any money moving — so the production hard-refusal is
 * the security property that matters, and it is what most of this file pins.
 */
describe('PaymentDiagnosticsController', () => {
  const ORIGINAL_ENV = process.env.NODE_ENV;

  let simulator: PaymentSimulatorService;
  let events: { summary: jest.Mock };
  let controller: PaymentDiagnosticsController;

  beforeEach(() => {
    process.env.NODE_ENV = 'development';
    simulator = new PaymentSimulatorService();
    events = { summary: jest.fn().mockResolvedValue({ total: 0 }) };
    controller = new PaymentDiagnosticsController(simulator, events as never);
  });

  afterEach(() => {
    process.env.NODE_ENV = ORIGINAL_ENV;
  });

  describe('in production', () => {
    beforeEach(() => {
      process.env.NODE_ENV = 'production';
    });

    /**
     * A 404, not a 403: the routes behave as though they do not exist, so a
     * prober cannot even learn that a simulator is compiled into the build.
     */
    it('hides the simulator read', () => {
      expect(() => controller.getSimulator()).toThrow(NotFoundException);
    });

    it('refuses to force a payment outcome', () => {
      expect(() => controller.setSimulator({ mode: 'success' })).toThrow(NotFoundException);
      expect(simulator.isActive()).toBe(false);
    });

    it('hides the health summary', async () => {
      await expect(controller.health()).rejects.toBeInstanceOf(NotFoundException);
      expect(events.summary).not.toHaveBeenCalled();
    });
  });

  describe('outside production', () => {
    it('reports the simulator state, off by default', () => {
      expect(controller.getSimulator()).toEqual({ mode: 'off', delayMs: 6000, active: false });
    });

    it('forces a mode and reports it back as active', () => {
      const state = controller.setSimulator({ mode: 'timeout', delayMs: 1234 });

      expect(state).toEqual({ mode: 'timeout', delayMs: 1234, active: true });
      expect(simulator.isActive()).toBe(true);
    });

    it('rejects a mode outside the known set', () => {
      expect(() => controller.setSimulator({ mode: 'drain-the-account' as never })).toThrow(
        BadRequestException,
      );
      expect(simulator.isActive()).toBe(false);
    });

    it('defaults the health window to 60 minutes', async () => {
      await controller.health();

      expect(events.summary).toHaveBeenCalledWith(60);
    });

    /** A caller-supplied window is clamped so it cannot become an expensive scan. */
    it.each([
      ['0', 1],
      ['-5', 1],
      ['99999', 1440],
      ['120', 120],
    ])('clamps a window of %s to %i', async (input, expected) => {
      await controller.health(input);

      expect(events.summary).toHaveBeenCalledWith(expected);
    });
  });
});
