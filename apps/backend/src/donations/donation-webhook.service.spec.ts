import { DonationWebhookService } from './donation-webhook.service';
import { Donation, DonationStatus } from './entities/donation.entity';

const REF = 'DON-937683a2-1787404483323';

function makeDonation(amount: number, status = DonationStatus.PENDING): Donation {
  return {
    id: `d-${amount}`,
    paymentReference: REF,
    amount,
    currency: 'RWF',
    donorName: 'Cart Donor',
    donorPhone: '0781234567',
    status,
  } as Donation;
}

function paidPayload(): Record<string, string> {
  return {
    requesttransactionid: REF,
    transactionid: '880004394572',
    responsecode: '01',
    status: 'Successfull',
    statusdesc: 'Paid via ONLINE_CARD',
    message: 'Paid via ONLINE_CARD',
  };
}

function build(found: Donation[]) {
  const repo = {
    find: jest.fn().mockResolvedValue(found),
    save: jest.fn(async (v: unknown) => v),
  };
  const smsService = { sendSms: jest.fn().mockResolvedValue(undefined) };
  return {
    service: new DonationWebhookService(repo as never, smsService as never),
    repo,
    smsService,
  };
}

describe('DonationWebhookService', () => {
  /**
   * A cart is several donations settled by one payment, so they share a
   * reference. Settling only the first would leave the rest pending while the
   * donor's money had already arrived.
   */
  it('settles every donation sharing the payment reference', async () => {
    const basket = [makeDonation(5000), makeDonation(3000), makeDonation(2000)];
    const { service, repo } = build(basket);

    await service.handleCallback(paidPayload());

    const saved = repo.save.mock.calls[0][0] as Donation[];
    expect(saved).toHaveLength(3);
    expect(saved.every((d) => d.status === DonationStatus.COMPLETED)).toBe(true);
  });

  it('thanks the donor once, for the basket total rather than per line', async () => {
    const { service, smsService } = build([makeDonation(5000), makeDonation(3000)]);

    await service.handleCallback(paidPayload());

    expect(smsService.sendSms).toHaveBeenCalledTimes(1);
    expect(smsService.sendSms.mock.calls[0][1]).toContain('8,000');
  });

  it('does not re-credit a basket that is already settled', async () => {
    const settled = [
      makeDonation(5000, DonationStatus.COMPLETED),
      makeDonation(3000, DonationStatus.COMPLETED),
    ];
    const { service, repo, smsService } = build(settled);

    await service.handleCallback(paidPayload());

    expect(repo.save).not.toHaveBeenCalled();
    expect(smsService.sendSms).not.toHaveBeenCalled();
  });

  it('settles only the still-pending lines of a partly-resolved basket', async () => {
    const mixed = [makeDonation(5000, DonationStatus.COMPLETED), makeDonation(3000)];
    const { service, repo } = build(mixed);

    await service.handleCallback(paidPayload());

    const saved = repo.save.mock.calls[0][0] as Donation[];
    expect(saved).toHaveLength(1);
    expect(saved[0].amount).toBe(3000);
  });

  it('marks the whole basket failed when the payment fails', async () => {
    const { service, repo, smsService } = build([makeDonation(5000), makeDonation(3000)]);

    await service.handleCallback({
      ...paidPayload(),
      responsecode: '1008',
      status: 'Failed',
      statusdesc: 'General Failure',
    });

    const saved = repo.save.mock.calls[0][0] as Donation[];
    expect(saved.every((d) => d.status === DonationStatus.FAILED)).toBe(true);
    expect(smsService.sendSms).not.toHaveBeenCalled();
  });

  it('ignores a still-pending notification', async () => {
    const { service, repo } = build([makeDonation(5000)]);

    await service.handleCallback({ ...paidPayload(), responsecode: '1000', status: 'Pending' });

    expect(repo.find).not.toHaveBeenCalled();
    expect(repo.save).not.toHaveBeenCalled();
  });

  it('ignores callbacks for other domains', async () => {
    const { service, repo } = build([makeDonation(5000)]);

    await service.handleCallback({ ...paidPayload(), requesttransactionid: 'MAR-0001-123' });

    expect(repo.find).not.toHaveBeenCalled();
  });

  it('logs and returns when no donation matches the reference', async () => {
    const { service, repo } = build([]);

    await expect(service.handleCallback(paidPayload())).resolves.toBeUndefined();
    expect(repo.save).not.toHaveBeenCalled();
  });
});
