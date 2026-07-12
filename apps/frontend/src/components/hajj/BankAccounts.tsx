'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Building2, Check, Copy, Loader2 } from 'lucide-react';
import { hajjApi, type HajjBankAccountItem } from '@/lib/hajjApi';

/**
 * Section: "Where to pay".
 *
 * The accounts an applicant transfers the Hajj fees into, admin-managed
 * (Content → Hajj Bank Accounts). The registration form asks for proof of
 * payment, so the applicant has to be told where to pay first.
 *
 * Renders nothing at all until an admin has entered real accounts — a public
 * payment page must never show a placeholder account number.
 */
export function BankAccounts() {
  const t = useTranslations('services.hajj.bankAccounts');

  const [items, setItems] = useState<HajjBankAccountItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    hajjApi.getBankAccounts()
      .then((res) => { if (active) setItems(res); })
      .catch(() => { if (active) setItems([]); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const copy = async (account: HajjBankAccountItem) => {
    try {
      await navigator.clipboard.writeText(account.accountNumber);
      setCopiedId(account.id);
      setTimeout(() => setCopiedId((id) => (id === account.id ? null : id)), 2000);
    } catch {
      /* clipboard blocked (insecure context, denied permission) — the number is
         on screen to copy by hand, so there is nothing useful to say here. */
    }
  };

  // Nothing configured yet: say nothing rather than show an empty promise.
  if (!loading && items.length === 0) return null;

  return (
    <section id="hajj-bank-accounts" className="scroll-mt-24">
      <div className="mb-8 max-w-2xl">
        <p className="mb-1 text-xs font-semibold uppercase tracking-[0.16em] text-rmc-gold">
          {t('eyebrow')}
        </p>
        <h2 className="text-2xl font-bold text-rmc-green-deep md:text-3xl">{t('title')}</h2>
        <p className="mt-2 text-sm text-gray-500">{t('subtitle')}</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16 text-gray-400">
          <Loader2 className="h-6 w-6 animate-spin" aria-label={t('loading')} />
        </div>
      ) : (
        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((a) => (
            <li
              key={a.id}
              className="flex flex-col gap-3 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm ring-1 ring-black/5"
            >
              <div className="flex items-start justify-between gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rmc-green/10 text-rmc-green">
                  <Building2 className="h-5 w-5" strokeWidth={2} aria-hidden="true" />
                </span>
                <span className="inline-flex items-center rounded-full bg-rmc-gold/20 px-2.5 py-0.5 text-[11px] font-bold text-rmc-green-deep">
                  {a.currency}
                </span>
              </div>

              <div>
                <h3 className="text-[15px] font-bold text-gray-900">{a.bankName}</h3>
                {a.branch && <p className="text-[12px] text-gray-400">{a.branch}</p>}
              </div>

              <dl className="flex flex-col gap-2 text-[13px]">
                <div>
                  <dt className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                    {t('accountName')}
                  </dt>
                  <dd className="text-gray-700">{a.accountName}</dd>
                </div>

                <div>
                  <dt className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                    {t('accountNumber')}
                  </dt>
                  <dd className="flex items-center gap-2">
                    {/* Tabular figures: a misread digit here sends money nowhere. */}
                    <span className="font-mono text-[14px] font-bold tabular-nums text-rmc-green-deep">
                      {a.accountNumber}
                    </span>
                    <button
                      type="button"
                      onClick={() => copy(a)}
                      aria-label={t('copy')}
                      className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-gray-200 text-gray-400 transition-colors hover:border-rmc-green/40 hover:text-rmc-green"
                    >
                      {copiedId === a.id
                        ? <Check className="h-3.5 w-3.5 text-rmc-green" aria-hidden="true" />
                        : <Copy className="h-3.5 w-3.5" aria-hidden="true" />}
                    </button>
                  </dd>
                  <span aria-live="polite" className="sr-only">
                    {copiedId === a.id ? t('copied') : ''}
                  </span>
                </div>

                {a.swiftCode && (
                  <div>
                    <dt className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                      {t('swift')}
                    </dt>
                    <dd className="font-mono text-gray-700">{a.swiftCode}</dd>
                  </div>
                )}
              </dl>
            </li>
          ))}
        </ul>
      )}

      <p className="mt-6 text-[13px] leading-relaxed text-gray-500">{t('proofNote')}</p>
    </section>
  );
}
