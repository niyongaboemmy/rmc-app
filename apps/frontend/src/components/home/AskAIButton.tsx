'use client';

import { useState, useRef, useEffect, type ReactNode } from 'react';
import { useLocale } from 'next-intl';
import { usePathname } from 'next/navigation';
import { X, Send, Bot, Sparkles, ArrowRight } from 'lucide-react';

// The assistant runs on the backend so the provider API key stays server-side.
const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api/v1';

interface Message {
  id: string;
  role: 'user' | 'ai';
  text: string;
}

const GREETING_ID = '0';

// Known internal routes — only these are linkified when written bare (avoids
// turning things like "and/or" into links). Markdown links can target any path.
const INTERNAL_ROUTES =
  'services/marriage/apply|services/marriage|services|about|activities|donate|contact|' +
  'register|login|member/register|member/dashboard|schools|blog|gallery|tenders|new-muslim';

const TOKEN_RE = new RegExp(
  [
    '\\[([^\\]]+)\\]\\((\\/[^)\\s]+|https?:\\/\\/[^)\\s]+|mailto:[^)\\s]+|tel:[^)\\s]+)\\)', // 1=label 2=target
    '(https?:\\/\\/[^\\s<>()]+)', // 3 bare URL
    '([A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,})', // 4 email
    '(\\(?\\+?250\\)?[\\s.-]?\\d{3}[\\s.-]?\\d{3}[\\s.-]?\\d{3})', // 5 Rwanda phone
    `(\\/(?:${INTERNAL_ROUTES})(?![A-Za-z0-9]))`, // 6 bare internal route
  ].join('|'),
  'g',
);

function hrefFor(target: string, locale: string): { href: string; external: boolean } {
  if (/^https?:\/\//i.test(target)) return { href: target, external: true };
  if (/^(mailto:|tel:)/i.test(target)) return { href: target, external: false };
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(target)) return { href: `mailto:${target}`, external: false };
  if (target.startsWith('/')) return { href: `/${locale}${target}`, external: false };
  return { href: target, external: true };
}

/** Render assistant text with clickable links, emails, phone numbers and site routes. */
function renderRichText(text: string, locale: string, role: 'user' | 'ai'): ReactNode[] {
  const nodes: ReactNode[] = [];
  const linkClass =
    'underline decoration-1 underline-offset-2 font-semibold hover:opacity-80 ' +
    (role === 'user' ? 'text-white' : 'text-rmc-green-dark');
  let last = 0;
  let key = 0;
  let m: RegExpExecArray | null;
  TOKEN_RE.lastIndex = 0;
  while ((m = TOKEN_RE.exec(text)) !== null) {
    if (m.index > last) nodes.push(text.slice(last, m.index));

    let label: string;
    let target: string;
    if (m[1] !== undefined) { label = m[1]; target = m[2]; }
    else if (m[3] !== undefined) { label = m[3]; target = m[3]; }
    else if (m[4] !== undefined) { label = m[4]; target = m[4]; }
    else if (m[5] !== undefined) { label = m[5]; target = `tel:+${m[5].replace(/[^\d]/g, '')}`; }
    else { label = m[6]; target = m[6]; }

    const { href, external } = hrefFor(target, locale);
    nodes.push(
      <a
        key={`lnk-${key++}`}
        href={href}
        className={linkClass}
        {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
      >
        {label}
      </a>,
    );
    last = m.index + m[0].length;
  }
  if (last < text.length) nodes.push(text.slice(last));
  return nodes;
}

// Localized first-screen copy. The AI itself replies in the visitor's language
// (incl. French) regardless; these strings just localize the widget chrome and
// the opening greeting for the three site locales.
type UIStrings = {
  askAi: string;
  askShort: string;
  close: string;
  title: string;
  subtitle: string;
  greeting: string;
  suggestedLabel: string;
  suggested: string[];
  placeholder: string;
  thinking: string;
  connError: string;
  noResponse: string;
  poweredBy: string;
};

const STRINGS: Record<string, UIStrings> = {
  en: {
    askAi: 'Ask AI',
    askShort: 'Ask',
    close: 'Close',
    title: 'RMC Assistant',
    subtitle: 'Answers in your language',
    greeting:
      "As-salamu alaykum! 👋 I'm the RMC assistant. I can help you find information about our services, prayer times, events, and more. How can I assist you today?",
    suggestedLabel: 'Suggested',
    suggested: [
      'What services does RMC offer?',
      'How do I apply for a scholarship?',
      "When are today's prayer times?",
      'How can I find the nearest mosque?',
    ],
    placeholder: 'Ask a question...',
    thinking: 'Thinking…',
    connError:
      "Sorry — I'm having trouble connecting right now. Please reach us at rwandamuslimc@gmail.com or +250 788 308 436.",
    noResponse: 'Sorry, I could not generate a response. Please try again.',
    poweredBy: 'Powered by RMC AI',
  },
  rw: {
    askAi: 'Baza AI',
    askShort: 'Baza',
    close: 'Funga',
    title: 'Umufasha wa RMC',
    subtitle: 'Asubiza mu rurimi rwawe',
    greeting:
      "As-salamu alaykum! 👋 Ndi umufasha wa RMC. Nshobora kugufasha kubona amakuru ku serivisi zacu, amasaha y'amasengesho, ibikorwa n'ibindi. Nagufasha iki uyu munsi?",
    suggestedLabel: 'Ibibazo bikunze kubazwa',
    suggested: [
      'RMC itanga serivisi zihe?',
      'Nasaba nte buruse (scholarship)?',
      "Amasaha y'amasengesho y'uyu munsi ni ayahe?",
      'Nabona nte umusigiti uri hafi yanjye?',
    ],
    placeholder: 'Baza ikibazo...',
    thinking: 'Ndategura igisubizo…',
    connError:
      'Ihangane — mfite ikibazo cyo guhuza ubu. Wadusanga kuri rwandamuslimc@gmail.com cyangwa +250 788 308 436.',
    noResponse: 'Ihangane, sinabashije gutanga igisubizo. Ongera ugerageze.',
    poweredBy: 'Bikorwa na RMC AI',
  },
  ar: {
    askAi: 'اسأل الذكاء الاصطناعي',
    askShort: 'اسأل',
    close: 'إغلاق',
    title: 'مساعد RMC',
    subtitle: 'يجيب بلغتك',
    greeting:
      'السلام عليكم! 👋 أنا مساعد RMC. يمكنني مساعدتك في الحصول على معلومات حول خدماتنا وأوقات الصلاة والفعاليات والمزيد. كيف يمكنني مساعدتك اليوم؟',
    suggestedLabel: 'أسئلة مقترحة',
    suggested: [
      'ما الخدمات التي تقدمها RMC؟',
      'كيف أتقدم بطلب للحصول على منحة دراسية؟',
      'ما هي أوقات الصلاة اليوم؟',
      'كيف أجد أقرب مسجد؟',
    ],
    placeholder: 'اطرح سؤالاً...',
    thinking: 'جارٍ التفكير…',
    connError:
      'عذراً — أواجه مشكلة في الاتصال حالياً. يمكنك التواصل معنا على rwandamuslimc@gmail.com أو ‎+250 788 308 436.',
    noResponse: 'عذراً، لم أتمكن من إنشاء رد. يرجى المحاولة مرة أخرى.',
    poweredBy: 'مدعوم بواسطة RMC AI',
  },
};

export function AskAIButton() {
  const locale = useLocale();
  const pathname = usePathname();
  const t = STRINGS[locale] ?? STRINGS.en;

  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>(() => [
    { id: GREETING_ID, role: 'ai', text: t.greeting },
  ]);
  const [input, setInput] = useState('');
  const [typing, setTyping] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, typing]);

  const send = async (text: string) => {
    if (!text.trim() || typing) return;

    const userMsg: Message = { id: Date.now().toString(), role: 'user', text };
    const history = [...messages, userMsg];
    setMessages(history);
    setInput('');
    setTyping(true);

    const aiId = `${Date.now() + 1}`;

    // Conversation for the API: drop the static greeting, map 'ai' -> 'assistant'.
    const payload = history
      .filter((m) => m.id !== GREETING_ID)
      .map((m) => ({ role: m.role === 'ai' ? 'assistant' : 'user', content: m.text }));

    try {
      const res = await fetch(`${API_BASE}/ai/ask`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ messages: payload }),
      });

      if (!res.ok || !res.body) throw new Error(`Request failed: ${res.status}`);

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let acc = '';
      let started = false;

      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        acc += decoder.decode(value, { stream: true });
        if (!acc) continue;
        if (!started) {
          started = true;
          setTyping(false);
          setMessages((m) => [...m, { id: aiId, role: 'ai', text: acc }]);
        } else {
          setMessages((m) => m.map((msg) => (msg.id === aiId ? { ...msg, text: acc } : msg)));
        }
      }

      if (!started) {
        setTyping(false);
        setMessages((m) => [...m, { id: aiId, role: 'ai', text: t.noResponse }]);
      }
    } catch {
      setTyping(false);
      setMessages((m) => [...m, { id: aiId, role: 'ai', text: t.connError }]);
    }
  };

  // Keep the assistant off admin pages (which have their own dense UI).
  if (pathname?.includes('/admin')) return null;

  return (
    <>
      {/* Launcher — compact pill with icon + short label */}
      <button
        onClick={() => setOpen(true)}
        aria-label={t.askAi}
        title={t.askAi}
        className={`fixed bottom-5 right-5 sm:bottom-6 sm:right-6 z-[60] flex items-center gap-1.5 rounded-full py-2.5 pl-3 pr-4 text-sm font-semibold text-white bg-gradient-to-br from-rmc-green to-rmc-green-dark shadow-lg shadow-rmc-green/30 ring-1 ring-white/20 transition-all duration-300 hover:scale-105 hover:shadow-rmc-green/40 ${
          open ? 'pointer-events-none scale-90 opacity-0' : 'scale-100 opacity-100'
        }`}
      >
        <Sparkles className="h-4 w-4" />
        {t.askShort}
      </button>

      {/* Mobile backdrop */}
      <div
        onClick={() => setOpen(false)}
        className={`fixed inset-0 z-[55] bg-black/30 backdrop-blur-sm transition-opacity duration-300 sm:hidden ${
          open ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
      />

      {/* Chat panel */}
      <div
        className={`fixed z-[60] flex flex-col overflow-hidden border border-black/5 bg-white shadow-2xl
          inset-x-3 bottom-3 top-20 rounded-3xl
          sm:inset-auto sm:bottom-6 sm:right-6 sm:top-auto sm:h-[80vh] sm:max-h-[660px] sm:w-[400px] sm:rounded-[28px]
          origin-bottom-right transition-all duration-300 ${
            open
              ? 'scale-100 translate-y-0 opacity-100'
              : 'pointer-events-none scale-95 translate-y-4 opacity-0'
          }`}
      >
        {/* Header */}
        <div className="relative shrink-0 overflow-hidden bg-gradient-to-br from-rmc-green to-rmc-green-dark px-5 py-4 text-white">
          <div className="pointer-events-none absolute -right-6 -top-10 h-32 w-32 rounded-full bg-white/10 blur-2xl" />
          <div className="relative flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/15 ring-1 ring-white/25">
                  <Bot className="h-6 w-6" />
                </div>
                <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-green-400 ring-2 ring-rmc-green-dark" />
              </div>
              <div>
                <p className="font-bold leading-tight">{t.title}</p>
                <p className="mt-0.5 flex items-center gap-1.5 text-[11px] text-white/75">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-green-300" />
                  {t.subtitle}
                </p>
              </div>
            </div>
            <button
              onClick={() => setOpen(false)}
              aria-label={t.close}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-white/15 text-white transition-colors hover:bg-white/25"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
        {/* Gold accent line */}
        <div className="h-0.5 w-full shrink-0 bg-gradient-to-r from-rmc-gold/0 via-rmc-gold to-rmc-gold/0" />

        {/* Messages */}
        <div className="flex-1 space-y-4 overflow-y-auto bg-gradient-to-b from-gray-50/80 to-white px-4 py-4" style={{ minHeight: 0 }}>
          {messages.map((msg) => (
            <div key={msg.id} className={`flex items-end gap-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              {msg.role === 'ai' && (
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-rmc-green-light ring-1 ring-rmc-green/10">
                  <Bot className="h-3.5 w-3.5 text-rmc-green" />
                </div>
              )}
              <div
                className={`max-w-[82%] whitespace-pre-wrap break-words px-4 py-2.5 text-sm leading-relaxed shadow-sm ${
                  msg.role === 'user'
                    ? 'rounded-2xl rounded-br-md bg-gradient-to-br from-rmc-green to-rmc-green-dark text-white'
                    : 'rounded-2xl rounded-bl-md bg-white text-gray-700 ring-1 ring-gray-100'
                }`}
              >
                {renderRichText(msg.text, locale, msg.role)}
              </div>
            </div>
          ))}

          {typing && (
            <div className="flex items-end gap-2">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-rmc-green-light ring-1 ring-rmc-green/10">
                <Bot className="h-3.5 w-3.5 text-rmc-green" />
              </div>
              <div className="flex items-center gap-1 rounded-2xl rounded-bl-md bg-white px-4 py-3 shadow-sm ring-1 ring-gray-100">
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-rmc-green/50" style={{ animationDelay: '0ms' }} />
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-rmc-green/50" style={{ animationDelay: '150ms' }} />
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-rmc-green/50" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          )}

          {/* Suggested (only when fresh) */}
          {messages.length === 1 && (
            <div className="pt-1">
              <p className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-wide text-gray-400">{t.suggestedLabel}</p>
              <div className="flex flex-col gap-2">
                {t.suggested.map((s) => (
                  <button
                    key={s}
                    onClick={() => send(s)}
                    className="group flex items-center gap-2 rounded-xl border border-gray-100 bg-white px-3.5 py-2.5 text-left text-[13px] text-gray-600 shadow-sm transition-all hover:border-rmc-green/30 hover:bg-rmc-green-light/40 hover:text-rmc-green-dark"
                  >
                    <Sparkles className="h-3.5 w-3.5 shrink-0 text-rmc-green/60 transition-colors group-hover:text-rmc-green" />
                    <span className="flex-1">{s}</span>
                    <ArrowRight className="h-3.5 w-3.5 shrink-0 text-gray-300 transition-all group-hover:translate-x-0.5 group-hover:text-rmc-green rtl:rotate-180" />
                  </button>
                ))}
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="shrink-0 border-t border-gray-100 bg-white px-3 pb-3 pt-2.5">
          <div className="flex items-center gap-2 rounded-2xl border border-gray-200 bg-gray-50 px-3 transition-colors focus-within:border-rmc-green/50 focus-within:bg-white focus-within:ring-2 focus-within:ring-rmc-green/10">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && send(input)}
              disabled={typing}
              placeholder={typing ? t.thinking : t.placeholder}
              className="flex-1 bg-transparent py-2.5 text-sm text-gray-700 outline-none placeholder:text-gray-400 disabled:opacity-60"
            />
            <button
              onClick={() => send(input)}
              disabled={!input.trim() || typing}
              aria-label={t.askAi}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-rmc-green to-rmc-green-dark text-white shadow-sm transition-all hover:shadow-md disabled:opacity-30 disabled:shadow-none"
            >
              <Send className="h-4 w-4 rtl:rotate-180" />
            </button>
          </div>
          <p className="mt-2 flex items-center justify-center gap-1 text-[10px] text-gray-300">
            <Sparkles className="h-3 w-3" /> {t.poweredBy}
          </p>
        </div>
      </div>
    </>
  );
}
