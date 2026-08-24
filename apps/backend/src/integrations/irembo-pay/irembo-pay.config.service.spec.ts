import { IremboPayConfigService } from './irembo-pay.config.service';
import { SettingsCacheBus } from '../../payment-settings/settings-cache.bus';
import { PaymentMethodCode } from '../../payment-settings/entities/payment-method.entity';

function build(settings: Record<string, string>, isTestMode = true) {
  const paymentSettings = {
    getRawSettings: jest.fn().mockResolvedValue(settings),
    getMethodSettingsRecord: jest.fn().mockResolvedValue({ isTestMode }),
  };
  const bus = new SettingsCacheBus();
  return {
    service: new IremboPayConfigService(paymentSettings as never, bus),
    paymentSettings,
    bus,
  };
}

const FULL = {
  secretKey: 'sk_test',
  publicKey: 'pk_test',
  paymentAccountIdentifier: 'TST-RWF',
};

describe('IremboPayConfigService', () => {
  describe('credential reads', () => {
    /**
     * Regression: settling money already in flight must not depend on the method
     * being active. Deactivating IremboPay is how a rollback is performed, and
     * callbacks for invoices issued beforehand keep arriving — a bank payment
     * settles days later. Reading with requireActive=true dropped them silently.
     */
    it('reads credentials even when the payment method is deactivated', async () => {
      const { service, paymentSettings } = build(FULL);

      await service.get();

      expect(paymentSettings.getRawSettings).toHaveBeenCalledWith(
        PaymentMethodCode.IREMBOPAY,
        false,
      );
      expect(paymentSettings.getMethodSettingsRecord).toHaveBeenCalledWith(
        PaymentMethodCode.IREMBOPAY,
        false,
      );
    });

    it('reports configured only when all three required fields are present', async () => {
      await expect(build(FULL).service.isConfigured()).resolves.toBe(true);
      await expect(build({ ...FULL, secretKey: '' }).service.isConfigured()).resolves.toBe(false);
      await expect(build({ ...FULL, publicKey: '' }).service.isConfigured()).resolves.toBe(false);
      await expect(
        build({ ...FULL, paymentAccountIdentifier: '' }).service.isConfigured(),
      ).resolves.toBe(false);
    });
  });

  describe('URL resolution', () => {
    it('derives sandbox URLs from the test-mode toggle', async () => {
      const cfg = await build(FULL, true).service.get();

      expect(cfg.apiBaseUrl).toBe('https://api.sandbox.irembopay.com');
      expect(cfg.widgetScriptUrl).toContain('dashboard.sandbox.irembopay.com');
      expect(cfg.isTestMode).toBe(true);
    });

    it('derives production URLs when test mode is off — no redeploy needed', async () => {
      const cfg = await build(FULL, false).service.get();

      expect(cfg.apiBaseUrl).toBe('https://api.irembopay.com');
      expect(cfg.widgetScriptUrl).toBe('https://dashboard.irembopay.com/assets/payment/inline.js');
    });

    it('lets an explicit override win over the toggle, trailing slash and all', async () => {
      const cfg = await build(
        { ...FULL, apiBaseUrl: 'https://proxy.rmc.rw/irembo/' },
        true,
      ).service.get();

      expect(cfg.apiBaseUrl).toBe('https://proxy.rmc.rw/irembo');
    });
  });

  describe('defaults', () => {
    it('falls back to documented defaults when fields are blank', async () => {
      const cfg = await build(FULL).service.get();

      expect(cfg.apiVersion).toBe('3');
      expect(cfg.invoiceExpiryMinutes).toBe(1440);
      expect(cfg.defaultLanguage).toBe('EN');
      expect(cfg.signatureToleranceSeconds).toBe(300);
    });

    it('ignores nonsense numeric settings rather than propagating NaN', async () => {
      const cfg = await build({
        ...FULL,
        invoiceExpiryMinutes: 'soon',
        signatureToleranceSeconds: '-5',
      }).service.get();

      expect(cfg.invoiceExpiryMinutes).toBe(1440);
      expect(cfg.signatureToleranceSeconds).toBe(300);
    });

    it('accepts a valid language and rejects an unknown one', async () => {
      await expect(build({ ...FULL, defaultLanguage: 'rw' }).service.get()).resolves.toMatchObject({
        defaultLanguage: 'RW',
      });
      await expect(build({ ...FULL, defaultLanguage: 'ZZ' }).service.get()).resolves.toMatchObject({
        defaultLanguage: 'EN',
      });
    });

    it('uses the USD account for USD and falls back to RWF otherwise', async () => {
      const { service } = build({ ...FULL, paymentAccountIdentifierUsd: 'TST-USD' });

      await expect(service.accountForCurrency('USD')).resolves.toBe('TST-USD');
      await expect(service.accountForCurrency('RWF')).resolves.toBe('TST-RWF');
      // No USD account configured is not an error — bill it to the RWF account.
      const { service: rwfOnly } = build(FULL);
      await expect(rwfOnly.accountForCurrency('USD')).resolves.toBe('TST-RWF');
    });
  });

  describe('caching', () => {
    it('caches within the TTL so a burst of charges does not hammer the settings table', async () => {
      const { service, paymentSettings } = build(FULL);

      await service.get();
      await service.get();

      expect(paymentSettings.getRawSettings).toHaveBeenCalledTimes(1);
    });

    it('takes a saved credential into effect on the very next call', async () => {
      const { service, paymentSettings, bus } = build(FULL);
      await service.get();

      paymentSettings.getRawSettings.mockResolvedValue({ ...FULL, secretKey: 'sk_rotated' });
      bus.emitMethodSettingsChanged(PaymentMethodCode.IREMBOPAY);

      await expect(service.get()).resolves.toMatchObject({ secretKey: 'sk_rotated' });
    });

    it('ignores a save for a different payment method', async () => {
      const { service, paymentSettings, bus } = build(FULL);
      await service.get();

      bus.emitMethodSettingsChanged(PaymentMethodCode.BANK_TRANSFER);
      await service.get();

      expect(paymentSettings.getRawSettings).toHaveBeenCalledTimes(1);
    });
  });
});
