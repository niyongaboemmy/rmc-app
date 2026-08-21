import { Injectable, Logger } from '@nestjs/common';
import { PaymentMethodCode } from './entities/payment-method.entity';

type Listener = (code: PaymentMethodCode) => void;

/**
 * Tells provider config caches that their settings row just changed.
 *
 * A direct call from `PaymentSettingsService` into each provider's config
 * service would be a dependency cycle — the config services already read
 * through `PaymentSettingsService`. This one-way bus keeps the invalidation
 * immediate without either side importing the other.
 */
@Injectable()
export class SettingsCacheBus {
  private readonly logger = new Logger(SettingsCacheBus.name);
  private readonly listeners = new Set<Listener>();

  onMethodSettingsChanged(listener: Listener): void {
    this.listeners.add(listener);
  }

  emitMethodSettingsChanged(code: PaymentMethodCode): void {
    for (const listener of this.listeners) {
      try {
        listener(code);
      } catch (err) {
        // A misbehaving cache must not fail the admin's save.
        this.logger.warn(`Settings cache listener failed for ${code}: ${err}`);
      }
    }
  }
}
