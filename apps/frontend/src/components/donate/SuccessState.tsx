'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { CheckCircle2, Printer, Heart, Home, RotateCcw, Loader2, Smartphone, XCircle } from 'lucide-react';
import { donationsApi } from '@/lib/donationsApi';
import { money, type CartItem } from './donateData';

export interface DonationSummary {
  reference: string;
  dateStr: string;
  items: CartItem[];
  currency: string;
  total: number;
  recurring: boolean;
  methodName: string;
  niyyahLabel: string;
  /** Donations awaiting payment-gateway confirmation (empty when already paid). */
  pendingPaymentIds: string[];
}

export function SuccessState({
  locale,
  summary,
  onReset,
}: {
  locale: string;
  summary: DonationSummary;
  onReset: () => void;
}) {
  const t = useTranslations('donate');
  const { reference, dateStr, items, currency, total, recurring, methodName, niyyahLabel, pendingPaymentIds } = summary;
  const [dua, setDua] = useState('');

  // Poll the gateway for donations still awaiting confirmation (e.g. a Mobile
  // Money prompt the donor approves on their phone). Resolves to completed/failed,
  // or gives up after a window and leaves the banner in its "pending" state.
  const [paymentStatus, setPaymentStatus] = useState<'pending' | 'completed' | 'failed' | null>(
    pendingPaymentIds.length ? 'pending' : null,
  );
  useEffect(() => {
    if (!pendingPaymentIds.length) return;
    let cancelled = false;
    let remaining = [...pendingPaymentIds];
    let sawFailure = false;
    let attempts = 0;
    const MAX_ATTEMPTS = 15;

    const tick = async () => {
      attempts += 1;
      const results = await Promise.all(
        remaining.map((id) => donationsApi.checkStatus(id).catch(() => null)),
      );
      if (cancelled) return;
      const next: string[] = [];
      results.forEach((d, i) => {
        if (!d || d.status === 'pending') next.push(remaining[i]);
        else if (d.status === 'failed' || d.status === 'refunded') sawFailure = true;
      });
      remaining = next;
      if (remaining.length === 0) {
        setPaymentStatus(sawFailure ? 'failed' : 'completed');
        clearInterval(timer);
      } else if (attempts >= MAX_ATTEMPTS) {
        clearInterval(timer); // give up; leave it "pending" for the donor to retry
      }
    };

    const timer = setInterval(tick, 4000);
    tick();
    return () => { cancelled = true; clearInterval(timer); };
  }, [pendingPaymentIds]);

  const printReceipt = () => {
    const rows = items
      .map(
        (it) =>
          `<tr><td>${escapeHtml(it.label)}</td><td style="color:#6b7280">${escapeHtml(it.categoryTitle)}</td><td style="text-align:right;font-weight:700">${money(currency, it.amount)}</td></tr>`,
      )
      .join('');
    const dir = locale === 'ar' ? 'rtl' : 'ltr';
    const html = `<!doctype html><html dir="${dir}" lang="${locale}"><head><meta charset="utf-8"><title>${escapeHtml(t('receipt.title'))} — ${reference}</title>
      <style>
        body{font-family:system-ui,-apple-system,sans-serif;color:#111827;max-width:640px;margin:40px auto;padding:0 24px}
        h1{color:#0D3D24;font-size:22px;margin:0 0 4px}
        .muted{color:#6b7280;font-size:13px}
        .badge{display:inline-block;background:#E8F5EE;color:#145C38;font-weight:700;font-size:12px;padding:4px 10px;border-radius:999px;margin-top:8px}
        table{width:100%;border-collapse:collapse;margin:24px 0;font-size:14px}
        td,th{padding:10px 0;border-bottom:1px solid #e5e7eb;text-align:${dir === 'rtl' ? 'right' : 'left'}}
        .total{display:flex;justify-content:space-between;font-size:18px;font-weight:800;padding-top:12px}
        .meta{font-size:13px;color:#374151;margin-top:8px;line-height:1.8}
        .foot{margin-top:32px;font-size:12px;color:#9ca3af;border-top:1px solid #e5e7eb;padding-top:16px}
      </style></head><body>
      <h1>${escapeHtml(t('receipt.org'))}</h1>
      <div class="muted">${escapeHtml(t('receipt.title'))}</div>
      <div class="badge">${escapeHtml(t('receipt.intention', { niyyah: niyyahLabel }))}</div>
      <div class="meta">
        <div><strong>${escapeHtml(t('receipt.reference'))}:</strong> ${reference}</div>
        <div><strong>${escapeHtml(t('receipt.date'))}:</strong> ${escapeHtml(dateStr)}</div>
        <div><strong>${escapeHtml(t('receipt.method'))}:</strong> ${escapeHtml(methodName)}${recurring ? ` · ${escapeHtml(t('receipt.monthlyRecurring'))}` : ''}</div>
      </div>
      <table><thead><tr><th>${escapeHtml(t('receipt.fund'))}</th><th>${escapeHtml(t('receipt.category'))}</th><th style="text-align:${dir === 'rtl' ? 'left' : 'right'}">${escapeHtml(t('receipt.amount'))}</th></tr></thead>
      <tbody>${rows}</tbody></table>
      <div class="total"><span>${escapeHtml(t('receipt.total'))}${recurring ? escapeHtml(t('receipt.perMonth')) : ''}</span><span>${money(currency, total)}</span></div>
      <div class="foot">${escapeHtml(t('receipt.foot1'))}<br/>${escapeHtml(t('receipt.foot2'))}</div>
      <script>window.onload=function(){window.print()}</script>
      </body></html>`;
    const w = window.open('', '_blank', 'width=720,height=900');
    if (w) {
      w.document.write(html);
      w.document.close();
    }
  };

  return (
    <div className="mx-auto max-w-xl animate-fade-up">
      <div className="rounded-3xl border border-gray-100 bg-white p-8 text-center shadow-sm ring-1 ring-black/5 sm:p-10">
        {/* Payment-confirmation banner (gateway-backed payments only) */}
        {paymentStatus === 'pending' && (
          <div className="mb-6 flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-left rtl:text-right">
            <Smartphone className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
            <div className="min-w-0">
              <p className="text-[13.5px] font-bold text-amber-900">{t('payment.pendingTitle')}</p>
              <p className="mt-0.5 text-[12.5px] leading-relaxed text-amber-700">{t('payment.pendingHint')}</p>
              <p className="mt-1.5 flex items-center gap-1.5 text-[11.5px] font-medium text-amber-600">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                {t('payment.checking')}
              </p>
            </div>
          </div>
        )}
        {paymentStatus === 'failed' && (
          <div className="mb-6 flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-left rtl:text-right">
            <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
            <p className="text-[13px] leading-relaxed text-red-700">{t('payment.failed')}</p>
          </div>
        )}
        {paymentStatus === 'completed' && (
          <div className="mb-6 flex items-center gap-2.5 rounded-2xl border border-rmc-green/20 bg-rmc-green-light/40 p-4 text-left rtl:text-right">
            <CheckCircle2 className="h-5 w-5 shrink-0 text-rmc-green" />
            <p className="text-[13px] font-semibold text-rmc-green-dark">{t('payment.completed')}</p>
          </div>
        )}
        <span className="mx-auto mb-5 flex h-16 w-16 animate-scale-in items-center justify-center rounded-full bg-rmc-green-light ring-1 ring-rmc-green/15">
          <CheckCircle2 className="h-8 w-8 text-rmc-green" />
        </span>
        <p className="mb-1 font-arabic text-xl text-rmc-green-dark" dir="rtl">جَزَاكَ اللَّهُ خَيْرًا</p>
        <h2 className="mb-2 text-2xl font-bold text-gray-900">{t('success.thankYou')}</h2>
        <p className="mb-6 text-sm leading-relaxed text-gray-500">
          {t.rich('success.summary', {
            amount: money(currency, total),
            recurring: recurring ? t('success.monthly') : '',
            count: items.length,
            fundWord: items.length === 1 ? t('success.fundWordOne') : t('success.fundWordOther'),
            method: methodName,
            b: (c) => <span className="font-bold text-gray-900">{c}</span>,
          })}
        </p>

        {/* Dua */}
        <div className="mb-6 rounded-2xl border border-rmc-green/15 bg-rmc-green-light/30 p-4 text-left rtl:text-right">
          <p className="mb-2 flex items-center gap-1.5 text-[13px] font-bold text-rmc-green-dark">
            <Heart className="h-4 w-4" />
            {t('success.duaTitle')}
          </p>
          <textarea
            value={dua}
            onChange={(e) => setDua(e.target.value)}
            rows={3}
            placeholder={t('success.duaPlaceholder')}
            className="w-full resize-none rounded-xl border border-rmc-green/20 bg-white px-3.5 py-2.5 text-[13px] text-gray-800 outline-none transition-colors focus:border-rmc-green focus:ring-1 focus:ring-rmc-green/30"
          />
          {dua.trim() && <p className="mt-2 text-[12px] italic text-rmc-green-dark">{t('success.duaAmin')}</p>}
        </div>

        <div className="flex flex-col gap-2.5 sm:flex-row sm:justify-center">
          <button
            type="button"
            onClick={printReceipt}
            className="inline-flex items-center justify-center gap-2 rounded-full bg-rmc-green px-5 py-2.5 text-sm font-bold text-white shadow-sm transition-all duration-300 hover:bg-rmc-green-dark"
          >
            <Printer className="h-4 w-4" />
            {t('success.downloadReceipt')}
          </button>
          <Link
            href={`/${locale}`}
            className="inline-flex items-center justify-center gap-2 rounded-full border border-rmc-green/30 px-5 py-2.5 text-sm font-bold text-rmc-green transition-all duration-300 hover:bg-rmc-green hover:text-white"
          >
            <Home className="h-4 w-4" />
            {t('success.backHome')}
          </Link>
          <button
            type="button"
            onClick={onReset}
            className="inline-flex items-center justify-center gap-2 rounded-full px-5 py-2.5 text-sm font-bold text-gray-500 transition-colors hover:text-rmc-green"
          >
            <RotateCcw className="h-4 w-4" />
            {t('success.giveAgain')}
          </button>
        </div>
      </div>
    </div>
  );
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
}
