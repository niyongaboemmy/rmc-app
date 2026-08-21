import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  PaymentProviderEvent,
  PaymentEventOutcome,
} from '../intouch-pay/entities/payment-provider-event.entity';
import { IremboPayConfigService } from './irembo-pay.config.service';
import { IremboEnvelope, IremboPayApiError, describeIremboError } from './irembo-pay.types';

/** IremboPay calls recorded in `payment_provider_events`. */
export type IremboOperation = 'create_invoice' | 'get_invoice' | 'initiate_push' | 'update_invoice';

const TIMEOUT_MS = 30_000;
const MAX_ATTEMPTS = 3;
const BASE_BACKOFF_MS = 1_000;
const SLOW_MS = 8_000;

export interface IremboRequestOptions {
  method: 'GET' | 'POST' | 'PUT';
  /** Path below the API host, e.g. `/payments/invoices`. */
  path: string;
  body?: unknown;
  /** Overrides the configured version for this call (v2 for subscriptions, etc.). */
  apiVersion?: string;
  /** Correlation id recorded on the telemetry row. */
  transactionId?: string;
}

/**
 * The single HTTP door to IremboPay.
 *
 * Three things it guarantees, none of which belong in business code:
 *  - the secret key never reaches a log line or an error message;
 *  - only 429 and 5xx are retried — retrying a `DUPLICATE_TRANSACTION_ID`
 *    would loop until the timeout with no chance of a different answer;
 *  - every attempt lands in `payment_provider_events`, so "is IremboPay slow?"
 *    is a query rather than a log trawl.
 */
@Injectable()
export class IremboPayClient {
  private readonly logger = new Logger(IremboPayClient.name);

  constructor(
    private readonly config: IremboPayConfigService,
    @InjectRepository(PaymentProviderEvent)
    private readonly eventRepo: Repository<PaymentProviderEvent>,
  ) {}

  async request<T>(op: IremboOperation, opts: IremboRequestOptions): Promise<T> {
    const cfg = await this.config.get();
    if (!cfg.secretKey) {
      throw new IremboPayApiError(
        'IremboPay is not configured — add the secret key in Admin → Settings → Payments.',
        0,
        'AUTHENTICATION_FAILED',
      );
    }

    const url = `${cfg.apiBaseUrl}${opts.path}`;
    let lastError: IremboPayApiError | undefined;

    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      const startedAt = Date.now();
      try {
        const data = await this.attempt<T>(
          url,
          opts,
          cfg.secretKey,
          opts.apiVersion ?? cfg.apiVersion,
        );
        await this.record(op, 'success', Date.now() - startedAt, attempt, opts.transactionId);
        return data;
      } catch (err) {
        const apiError = this.asApiError(err, url);
        const latency = Date.now() - startedAt;
        const outcome: PaymentEventOutcome = apiError.code === 'TIMEOUT' ? 'timeout' : 'error';
        await this.record(
          op,
          outcome,
          latency,
          attempt,
          opts.transactionId,
          apiError.code,
          apiError.message,
        );

        lastError = apiError;

        const isLastAttempt = attempt === MAX_ATTEMPTS;
        if (!apiError.retryable || isLastAttempt) {
          this.logger.warn(
            `[IremboPay] ${op} ${opts.method} ${url} failed (attempt ${attempt}/${MAX_ATTEMPTS}) ` +
              `status=${apiError.httpStatus} code=${apiError.code ?? '-'}`,
          );
          throw apiError;
        }

        const backoff = BASE_BACKOFF_MS * 2 ** (attempt - 1) + Math.floor(Math.random() * 250);
        this.logger.warn(
          `[IremboPay] ${op} transient failure (status=${apiError.httpStatus}) — retrying in ${backoff}ms`,
        );
        await sleep(backoff);
      }
    }

    /* istanbul ignore next — the loop always returns or throws. */
    throw lastError ?? new IremboPayApiError('IremboPay request failed', 0, 'NETWORK_ERROR');
  }

  private async attempt<T>(
    url: string,
    opts: IremboRequestOptions,
    secretKey: string,
    apiVersion: string,
  ): Promise<T> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

    let response: Response;
    try {
      response = await fetch(url, {
        method: opts.method,
        headers: {
          'Content-Type': 'application/json',
          'irembopay-secretKey': secretKey,
          'X-API-Version': apiVersion,
        },
        body: opts.body === undefined ? undefined : JSON.stringify(opts.body),
        signal: controller.signal,
      });
    } catch (err) {
      const aborted = (err as Error)?.name === 'AbortError';
      throw new IremboPayApiError(
        aborted ? describeIremboError('TIMEOUT') : describeIremboError('NETWORK_ERROR'),
        aborted ? 408 : 0,
        aborted ? 'TIMEOUT' : 'NETWORK_ERROR',
        undefined,
        url,
      );
    } finally {
      clearTimeout(timer);
    }

    const text = await response.text();
    let envelope: IremboEnvelope<T>;
    try {
      envelope = JSON.parse(text) as IremboEnvelope<T>;
    } catch {
      throw new IremboPayApiError(
        describeIremboError('BAD_RESPONSE'),
        response.status,
        'BAD_RESPONSE',
        // The body may echo request fields; truncate and never include headers.
        text.slice(0, 200),
        url,
      );
    }

    if (!response.ok || envelope.success === false) {
      const first = envelope.errors?.[0];
      throw new IremboPayApiError(
        describeIremboError(first?.code, first?.detail ?? envelope.message),
        response.status,
        first?.code,
        first?.detail ?? envelope.message,
        url,
      );
    }

    return envelope.data as T;
  }

  private asApiError(err: unknown, url: string): IremboPayApiError {
    if (err instanceof IremboPayApiError) return err;
    return new IremboPayApiError(
      describeIremboError('NETWORK_ERROR'),
      0,
      'NETWORK_ERROR',
      undefined,
      url,
    );
  }

  private async record(
    operation: IremboOperation,
    outcome: PaymentEventOutcome,
    latencyMs: number,
    attempt: number,
    transactionId?: string,
    responseCode?: string,
    detail?: string,
  ): Promise<void> {
    try {
      await this.eventRepo.save(
        this.eventRepo.create({
          provider: 'irembopay',
          operation,
          outcome,
          simulated: false,
          latencyMs,
          slow: latencyMs >= SLOW_MS,
          attempt,
          responseCode: responseCode ?? null,
          requestTransactionId: transactionId ?? null,
          detail: detail ?? null,
        }),
      );
    } catch (err) {
      // Telemetry must never take down a payment.
      this.logger.warn(`[IremboPay] Failed to record provider event: ${(err as Error).message}`);
    }
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
