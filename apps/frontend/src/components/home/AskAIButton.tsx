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
      .filter((m) => m.id !== GREETING.id)
      .map((m) => ({ role: m.role === 'ai' ? 'assistant' : 'user', content: m.text }));

    try {
      const res = await fetch('/api/ask', {
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
        setMessages((m) => [
          ...m,
          { id: aiId, role: 'ai', text: 'Sorry, I could not generate a response. Please try again.' },
        ]);
      }
    } catch {
      setTyping(false);
      setMessages((m) => [
        ...m,
        {
          id: aiId,
          role: 'ai',
          text: "Sorry — I'm having trouble connecting right now. Please reach us at info@rmc.org.rw or +250 788 000 000.",
        },
      ]);
    }
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
                className={`max-w-[80%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap break-words ${
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
              disabled={typing}
              placeholder={typing ? 'Thinking…' : 'Ask a question...'}
              className="flex-1 bg-transparent text-sm text-gray-700 outline-none placeholder:text-gray-300 disabled:opacity-60"
            />
            <button
              onClick={() => send(input)}
              disabled={!input.trim() || typing}
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
