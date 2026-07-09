import { Observable } from 'rxjs';
export interface PaymentCallbackEvent {
    type: 'payment.confirmed' | 'payment.failed' | 'payment.pending';
    requestTransactionId: string;
    transactionId: string;
    status: string;
    responseCode: string;
    message: string;
}
export declare class PaymentEventsService {
    private readonly bus;
    emit(event: PaymentCallbackEvent): void;
    get stream$(): Observable<PaymentCallbackEvent>;
}
