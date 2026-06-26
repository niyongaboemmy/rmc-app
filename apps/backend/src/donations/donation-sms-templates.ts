export const DonationSmsTemplates = {
  paymentConfirmed(amount: string, currency: string, donorName?: string | null): string {
    const who = donorName ? ` ${donorName},` : '';
    return `RMC Donations |${who} JazakAllah khairan! Your gift of ${amount} ${currency} is received. May Allah bless you. rwandamuslim.org`;
  },
} as const;
