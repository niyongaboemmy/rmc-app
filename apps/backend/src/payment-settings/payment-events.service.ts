import { Injectable } from '@nestjs/common';
import { Observable, Subject } from 'rxjs';

export interface PaymentCallbackEvent {
  type: 'payment.confirmed' | 'payment.failed' | 'payment.pending';
  requestTransactionId: string;
  transactionId: string;
  status: string;
  responseCode: string;
  message: string;
}

@Injectable()
export class PaymentEventsService {
  private readonly bus = new Subject<PaymentCallbackEvent>();

  emit(event: PaymentCallbackEvent): void {
    this.bus.next(event);
  }

  get stream$(): Observable<PaymentCallbackEvent> {
    return this.bus.asObservable();
  }
}
