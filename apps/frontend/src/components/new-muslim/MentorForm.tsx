'use client';

/**
 * Section: "Register & get a mentor" — the one conversion point on the page.
 * Submits through the shared contact endpoint with a fixed internal subject, so
 * the request lands in the same inbox the team already watches.
 *
 * Placeholders, the button label and the result states are CMS copy but live in
 * attributes / branches the visitor cannot see at the same time, so — like the
 * map labels — Edit Mode exposes them in a labelled panel under the form rather
 * than in place.
 */

import { useState } from 'react';
import { CheckCircle2, Loader2, Send } from 'lucide-react';
import { pick } from '@/lib/content-api';
import { submitContactMessage } from '@/lib/contactApi';
import { InlineText } from '@/components/edit-mode/InlineText';
import { SectionHeading, useNewMuslimCopy } from './shared';

type Status = 'idle' | 'sending' | 'done' | 'error';

/** Copy fields surfaced in the Edit Mode panel, in the order they read best. */
const EDITABLE_LABELS = [
  ['namePlaceholder', 'Name field'],
  ['emailPlaceholder', 'Email field'],
  ['phonePlaceholder', 'Phone field'],
  ['messagePlaceholder', 'Message field'],
  ['submitLabel', 'Submit button'],
  ['errorText', 'Error message'],
  ['successTitle', 'Success title'],
  ['successBody', 'Success message'],
] as const;

export function MentorForm() {
  const { locale, lang, dir, arabicFont, content, editing, setField } = useNewMuslimCopy();
  const c = content.mentor;

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState<Status>('idle');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) return;
    setStatus('sending');
    try {
      await submitContactMessage({
        name: name.trim(),
        email: email.trim(),
        subject: 'New Muslim — Registration / Mentor Request',
        message:
          `A new Muslim would like guidance and support.\n\n` +
          `Name: ${name}\nEmail: ${email}\nPhone: ${phone || '—'}\n\n` +
          `Message: ${message || '(none)'}`,
      });
      setStatus('done');
    } catch {
      setStatus('error');
    }
  };

  const inputCls =
    'w-full rounded-lg border border-gray-200 bg-gray-50/60 px-4 py-3 text-sm text-gray-900 placeholder-gray-400 transition-colors focus:border-rmc-green/40 focus:bg-white focus:outline-none focus:ring-2 focus:ring-rmc-green/20';

  return (
    <section id="mentor" className="relative scroll-mt-24 overflow-hidden bg-white py-14 lg:py-16">
      <div className="mx-auto max-w-7xl px-6 sm:px-8 lg:px-12">
        <SectionHeading
          heading={c}
          locale={locale}
          dir={dir}
          arabicFont={arabicFont}
          onEyebrow={(v) => setField((d) => { d.mentor.eyebrow[lang] = v; })}
          onTitle={(v) => setField((d) => { d.mentor.title[lang] = v; })}
          onSubtitle={(v) => setField((d) => { d.mentor.subtitle[lang] = v; })}
        />

        <div className="mx-auto mt-12 max-w-2xl">
          {status === 'done' ? (
            <div
              dir={dir}
              className="flex flex-col items-center rounded-lg border border-rmc-green/20 bg-rmc-green-light/60 p-10 text-center"
            >
              <CheckCircle2 className="mb-4 h-12 w-12 text-rmc-green" aria-hidden />
              <h3 className={`text-xl font-bold text-rmc-green-deep ${arabicFont}`}>
                {pick(c.successTitle, locale)}
              </h3>
              <p className={`mt-2 text-sm leading-relaxed text-gray-600 ${arabicFont}`}>
                {pick(c.successBody, locale)}
              </p>
            </div>
          ) : (
            <form
              onSubmit={submit}
              dir={dir}
              className="overflow-hidden rounded-lg border border-gray-200/70 bg-white p-8 shadow-sm md:p-10"
            >
              <div className="space-y-3">
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={pick(c.namePlaceholder, locale)}
                  className={inputCls}
                />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={pick(c.emailPlaceholder, locale)}
                  className={inputCls}
                />
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder={pick(c.phonePlaceholder, locale)}
                  className={inputCls}
                />
                <textarea
                  rows={3}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder={pick(c.messagePlaceholder, locale)}
                  className={`${inputCls} resize-none`}
                />
              </div>

              {status === 'error' && (
                <p className={`mt-3 text-sm text-red-600 ${arabicFont}`}>{pick(c.errorText, locale)}</p>
              )}

              <button
                type="submit"
                disabled={status === 'sending'}
                className={`mt-5 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-rmc-green px-6 py-3 text-sm font-bold text-white shadow-lg shadow-rmc-green/25 transition-colors hover:bg-rmc-green-dark disabled:opacity-60 ${arabicFont}`}
              >
                {status === 'sending' ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                ) : (
                  <Send className="h-4 w-4" aria-hidden />
                )}
                {pick(c.submitLabel, locale)}
              </button>
            </form>
          )}

          {editing && (
            <div className="mt-4 rounded-lg border-2 border-dashed border-rmc-green/25 bg-white p-4">
              <p className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-rmc-green/70">
                Form labels
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                {EDITABLE_LABELS.map(([key, caption]) => (
                  <label key={key} className="block">
                    <span className="text-[11px] font-medium text-gray-400">{caption}</span>
                    <InlineText
                      as="p"
                      lang={locale}
                      dir={dir}
                      value={pick(c[key], locale)}
                      onCommit={(v) => setField((d) => { d.mentor[key][lang] = v; })}
                      className="mt-0.5 rounded-md bg-gray-50 px-2.5 py-1.5 text-sm text-gray-800"
                      placeholder={caption}
                    />
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
