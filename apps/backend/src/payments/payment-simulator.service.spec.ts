import { PaymentSimulatorService } from './payment-simulator.service';

/** The in-memory switch that forces provider conditions during local testing. */
describe('PaymentSimulatorService', () => {
  const ORIGINAL = {
    mode: process.env.PAYMENT_SIMULATE_MODE,
    delay: process.env.PAYMENT_SIMULATE_DELAY_MS,
  };

  afterEach(() => {
    process.env.PAYMENT_SIMULATE_MODE = ORIGINAL.mode;
    process.env.PAYMENT_SIMULATE_DELAY_MS = ORIGINAL.delay;
  });

  it('is off unless the environment asks for something else', () => {
    delete process.env.PAYMENT_SIMULATE_MODE;

    const s = new PaymentSimulatorService();

    expect(s.state).toEqual({ mode: 'off', delayMs: 6000, active: false });
    expect(s.isActive()).toBe(false);
  });

  it('adopts a valid mode and delay from the environment', () => {
    process.env.PAYMENT_SIMULATE_MODE = 'slow';
    process.env.PAYMENT_SIMULATE_DELAY_MS = '250';

    expect(new PaymentSimulatorService().state).toEqual({
      mode: 'slow',
      delayMs: 250,
      active: true,
    });
  });

  /** A typo in an env var must not leave the simulator in an undefined mode. */
  it('falls back to off when the environment names an unknown mode', () => {
    process.env.PAYMENT_SIMULATE_MODE = 'nonsense';

    expect(new PaymentSimulatorService().isActive()).toBe(false);
  });

  it('keeps the current delay when set() omits one', () => {
    const s = new PaymentSimulatorService();

    s.set('fail');

    expect(s.state).toEqual({ mode: 'fail', delayMs: 6000, active: true });
  });

  it('ignores a negative delay', () => {
    const s = new PaymentSimulatorService();

    s.set('slow', -1);

    expect(s.state.delayMs).toBe(6000);
  });

  it.each(['off', 'slow', 'timeout', 'unavailable', 'success', 'fail'])(
    'accepts %s as a valid mode',
    (mode) => expect(PaymentSimulatorService.isValidMode(mode)).toBe(true),
  );

  it.each(['', 'OFF', 'succeed', 'drain'])('rejects %s', (mode) =>
    expect(PaymentSimulatorService.isValidMode(mode)).toBe(false),
  );
});
