'use client';

import { useState, useRef, useEffect } from 'react';
import { X, Send, Bot, Sparkles, ChevronDown } from 'lucide-react';

interface Message {
  id: string;
  role: 'user' | 'ai';
  text: string;
}

const SUGGESTED = [
  'What services does RMC offer?',
  'How do I apply for a scholarship?',
  'When are today\'s prayer times?',
  'How can I find the nearest mosque?',
];

const GREETING: Message = {
  id: '0',
  role: 'ai',
  text: 'As-salamu alaykum! 👋 I\'m the RMC assistant. I can help you find information about our services, prayer times, events, and more. How can I assist you today?',
};

export function AskAIButton() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([GREETING]);
  const [input, setInput] = useState('');
  const [typing, setTyping] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, typing]);

  const send = (text: string) => {
    if (!text.trim()) return;
    const userMsg: Message = { id: Date.now().toString(), role: 'user', text };
    setMessages((m) => [...m, userMsg]);
    setInput('');
    setTyping(true);

    setTimeout(() => {
      const reply = getStaticReply(text);
      setTyping(false);
      setMessages((m) => [...m, { id: (Date.now() + 1).toString(), role: 'ai', text: reply }]);
    }, 1200);
  };

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setOpen((o) => !o)}
        className={`fixed bottom-6 right-6 z-50 group flex items-center gap-2.5 px-5 py-3.5 rounded-full shadow-2xl text-white font-bold text-sm transition-all duration-300 ${
          open
            ? 'bg-gray-700 hover:bg-gray-800'
            : 'bg-gradient-to-r from-rmc-green to-rmc-green-dark hover:scale-105 hover:shadow-rmc-green/40'
        }`}
        aria-label="Ask AI"
      >
        {open ? (
          <>
            <ChevronDown className="w-4 h-4" />
            Close
          </>
        ) : (
          <>
            <Sparkles className="w-4 h-4 animate-pulse" />
            Ask AI
          </>
        )}
      </button>

      {/* Chat panel */}
      <div
        className={`fixed bottom-20 right-6 z-50 w-[340px] sm:w-[380px] bg-white rounded-3xl shadow-2xl border border-gray-100 flex flex-col overflow-hidden transition-all duration-300 origin-bottom-right ${
          open
            ? 'opacity-100 scale-100 translate-y-0'
            : 'opacity-0 scale-95 translate-y-4 pointer-events-none'
        }`}
        style={{ maxHeight: '520px' }}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-rmc-green to-rmc-green-dark px-5 py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-white/20 rounded-full flex items-center justify-center">
              <Bot className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-white font-bold text-sm leading-none">RMC Assistant</p>
              <p className="text-white/70 text-[11px] mt-0.5 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse inline-block" />
                Online
              </p>
            </div>
          </div>
          <button
            onClick={() => setOpen(false)}
            className="w-8 h-8 rounded-full bg-white/15 flex items-center justify-center text-white hover:bg-white/25 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3" style={{ minHeight: 0 }}>
          {messages.map((msg) => (
            <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              {msg.role === 'ai' && (
                <div className="w-7 h-7 bg-rmc-green-light rounded-full flex items-center justify-center mr-2 shrink-0 mt-0.5">
                  <Bot className="w-3.5 h-3.5 text-rmc-green" />
                </div>
              )}
              <div
                className={`max-w-[80%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-rmc-green text-white rounded-br-sm'
                    : 'bg-gray-100 text-gray-700 rounded-bl-sm'
                }`}
              >
                {msg.text}
              </div>
            </div>
          ))}

          {typing && (
            <div className="flex justify-start items-end gap-2">
              <div className="w-7 h-7 bg-rmc-green-light rounded-full flex items-center justify-center shrink-0">
                <Bot className="w-3.5 h-3.5 text-rmc-green" />
              </div>
              <div className="bg-gray-100 rounded-2xl rounded-bl-sm px-4 py-3 flex items-center gap-1">
                <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          )}

          {/* Suggested (only when fresh) */}
          {messages.length === 1 && (
            <div className="pt-1">
              <p className="text-[10px] text-gray-400 font-semibold mb-2 uppercase tracking-wide">Suggested</p>
              <div className="flex flex-wrap gap-1.5">
                {SUGGESTED.map((s) => (
                  <button
                    key={s}
                    onClick={() => send(s)}
                    className="text-xs px-3 py-1.5 rounded-full border border-rmc-green/25 text-rmc-green hover:bg-rmc-green hover:text-white transition-all duration-150"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="px-4 pb-4 pt-2 border-t border-gray-100 shrink-0">
          <div className="flex items-center gap-2 bg-gray-50 rounded-2xl px-4 py-2.5 border border-gray-100 focus-within:border-rmc-green/40 transition-colors">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && send(input)}
              placeholder="Ask a question..."
              className="flex-1 bg-transparent text-sm text-gray-700 outline-none placeholder:text-gray-300"
            />
            <button
              onClick={() => send(input)}
              disabled={!input.trim()}
              className="w-8 h-8 rounded-full bg-rmc-green flex items-center justify-center text-white disabled:opacity-30 hover:bg-rmc-green-dark transition-colors shrink-0"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </div>
          <p className="text-[10px] text-gray-300 text-center mt-2">Powered by RMC AI</p>
        </div>
      </div>
    </>
  );
}

function getStaticReply(input: string): string {
  const q = input.toLowerCase();
  if (q.includes('scholarship') || q.includes('school') || q.includes('education')) {
    return 'RMC offers scholarships for Muslim students at primary, secondary, and university levels. Visit our Services page or contact us at info@rmc.rw to apply. Applications for 2025/2026 close June 30th.';
  }
  if (q.includes('prayer') || q.includes('salah') || q.includes('time')) {
    return 'You can view today\'s prayer times on our homepage under "Prayer Times." We show times for Fajr, Sunrise, Dhuhr, Asr, Maghrib, and Isha based on your location.';
  }
  if (q.includes('mosque') || q.includes('masjid')) {
    return 'RMC has registered over 320 mosques across Rwanda\'s 5 provinces. Use our "Find Nearest Mosque" feature on the Contact page to locate the closest one to you.';
  }
  if (q.includes('marriage') || q.includes('nikah')) {
    return 'RMC provides official Islamic marriage documentation. You\'ll need both parties\' IDs, two witnesses\' IDs, the guardian\'s ID, and photos. Fees are 30,000 RWF in the mosque or 200,000 RWF outside. Visit our Services page.';
  }
  if (q.includes('service') || q.includes('offer')) {
    return 'RMC offers 7 key services: Marriage documentation, Funeral coordination, Good Conduct certificates, Scholarships, Hijra support, Tenders, and Job opportunities. Visit our Services page for details.';
  }
  if (q.includes('donate') || q.includes('donation') || q.includes('zakat')) {
    return 'Thank you for your generosity! You can support RMC\'s mission by donating via our contact page or bank transfer. Your contribution supports mosques, schools, orphans, and social programs.';
  }
  if (q.includes('contact') || q.includes('reach') || q.includes('phone') || q.includes('email')) {
    return 'You can reach RMC at info@rmc.rw or call +250 788 000 000. Our headquarters is in Rebero, Kigali. Visit our Contact page for a map and all contact details.';
  }
  return 'Thank you for your question! For detailed information, please visit our website or contact us directly at info@rmc.rw or +250 788 000 000. Our team will be happy to assist you. Jazakallahu Khairan!';
}
