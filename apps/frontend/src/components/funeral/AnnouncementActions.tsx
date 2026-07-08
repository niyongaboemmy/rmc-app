'use client';

import { useState } from 'react';
import { Share2, Printer, Check } from 'lucide-react';
import type { FuneralAnnouncement } from './types';

export interface ActionLabels {
  share: string;
  print: string;
  shareCopied: string;
  age: string;
  janazah: string;
  prayer: string;
  burial: string;
}

/** Share + print controls for a single announcement. Client-only. */
export function AnnouncementActions({
  item,
  labels,
  locale,
}: {
  item: FuneralAnnouncement;
  labels: ActionLabels;
  locale: string;
}) {
  const [copied, setCopied] = useState(false);

  const prayerStr = new Date(item.prayerTime).toLocaleString(locale, {
    weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit',
  });

  const summary =
    `${item.name} (${labels.age} ${item.age})\n` +
    `${labels.prayer}: ${prayerStr}\n` +
    `${labels.janazah}: ${item.janazahLocation}\n` +
    `${labels.burial}: ${item.burialLocation}` +
    (item.verse ? `\n\n${item.verse}` : '');

  const onShare = async () => {
    const url = typeof window !== 'undefined' ? window.location.href : '';
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({ title: item.name, text: summary, url });
        return;
      } catch {
        /* user cancelled — fall through to copy */
      }
    }
    try {
      await navigator.clipboard.writeText(`${summary}\n${url}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard unavailable — no-op */
    }
  };

  const onPrint = () => {
    const win = window.open('', '_blank', 'width=520,height=680');
    if (!win) return;
    const esc = (s: string) =>
      s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    win.document.write(`<!doctype html><html lang="${locale}"><head><meta charset="utf-8"><title>${esc(item.name)}</title>
      <style>
        *{box-sizing:border-box} body{font-family:Georgia,'Times New Roman',serif;color:#1f2937;margin:0;padding:40px;text-align:center}
        .verse{font-size:22px;color:#0D3D24;margin:0 0 24px;direction:rtl}
        h1{font-size:24px;margin:0 0 4px} .age{color:#6b7280;margin:0 0 20px;font-size:14px}
        table{margin:0 auto;border-collapse:collapse} td{padding:6px 10px;font-size:14px;text-align:left}
        td.k{color:#6b7280} td.v{font-weight:bold}
        .rule{width:60px;height:3px;background:#1A7A4A;margin:20px auto;border-radius:3px}
      </style></head><body>
      ${item.verse ? `<p class="verse">${esc(item.verse)}</p>` : ''}
      <div class="rule"></div>
      <h1>${esc(item.name)}</h1>
      <p class="age">${esc(labels.age)} ${item.age}</p>
      <table>
        <tr><td class="k">${esc(labels.prayer)}</td><td class="v">${esc(prayerStr)}</td></tr>
        <tr><td class="k">${esc(labels.janazah)}</td><td class="v">${esc(item.janazahLocation)}</td></tr>
        <tr><td class="k">${esc(labels.burial)}</td><td class="v">${esc(item.burialLocation)}</td></tr>
      </table>
      <div class="rule"></div>
      <script>window.onload=function(){window.print()}</script>
      </body></html>`);
    win.document.close();
  };

  const btn =
    'inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] font-semibold text-gray-500 transition-colors hover:bg-rmc-green-light/50 hover:text-rmc-green';

  return (
    <>
      <button type="button" onClick={onShare} className={btn}>
        {copied ? <Check className="h-3.5 w-3.5 text-rmc-green" aria-hidden="true" /> : <Share2 className="h-3.5 w-3.5" aria-hidden="true" />}
        {copied ? labels.shareCopied : labels.share}
      </button>
      <button type="button" onClick={onPrint} className={btn}>
        <Printer className="h-3.5 w-3.5" aria-hidden="true" />
        {labels.print}
      </button>
    </>
  );
}
