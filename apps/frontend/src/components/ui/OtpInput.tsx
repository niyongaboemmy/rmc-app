'use client';

import React, { useRef, useCallback, KeyboardEvent, ClipboardEvent, ChangeEvent } from 'react';

interface OtpInputProps {
  length?: number;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  error?: string;
  autoFocus?: boolean;
}

export function OtpInput({ length = 6, value, onChange, disabled, error, autoFocus }: OtpInputProps) {
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const digits = Array.from({ length }, (_, i) => value[i] ?? '');

  const focus = (index: number) => {
    const el = inputRefs.current[index];
    if (el) { el.focus(); el.select(); }
  };

  const update = useCallback((index: number, char: string) => {
    const next = digits.slice();
    next[index] = char;
    onChange(next.join(''));
  }, [digits, onChange]);

  const handleChange = (e: ChangeEvent<HTMLInputElement>, index: number) => {
    const char = e.target.value.replace(/\D/g, '').slice(-1);
    if (!char) return;
    update(index, char);
    if (index < length - 1) focus(index + 1);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>, index: number) => {
    if (e.key === 'Backspace') {
      e.preventDefault();
      if (digits[index]) {
        update(index, '');
      } else if (index > 0) {
        update(index - 1, '');
        focus(index - 1);
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      focus(index - 1);
    } else if (e.key === 'ArrowRight' && index < length - 1) {
      focus(index + 1);
    }
  };

  const handlePaste = (e: ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, length);
    onChange(pasted.padEnd(length, '').slice(0, length).split('').map((c, i) => pasted[i] ?? '').join(''));
    // Focus last filled box
    const focusIdx = Math.min(pasted.length, length - 1);
    focus(focusIdx);
  };

  return (
    <div>
      <div className="flex gap-2 justify-center">
        {Array.from({ length }, (_, i) => (
          <input
            key={i}
            ref={(el) => { inputRefs.current[i] = el; }}
            type="text"
            inputMode="numeric"
            pattern="\d*"
            maxLength={1}
            value={digits[i]}
            disabled={disabled}
            autoFocus={autoFocus && i === 0}
            onChange={(e) => handleChange(e, i)}
            onKeyDown={(e) => handleKeyDown(e, i)}
            onPaste={handlePaste}
            onFocus={(e) => e.target.select()}
            className={[
              'w-11 h-13 text-center text-xl font-bold rounded-xl border-2 outline-none transition-all duration-150 select-none',
              'focus:border-rmc-green focus:ring-2 focus:ring-rmc-green/20',
              error
                ? 'border-red-400 bg-red-50 text-red-700'
                : digits[i]
                  ? 'border-rmc-green bg-rmc-green/5 text-gray-900'
                  : 'border-gray-200 bg-gray-50 text-gray-900',
              disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-text',
            ].join(' ')}
            aria-label={`Digit ${i + 1}`}
          />
        ))}
      </div>
      {error && (
        <p className="mt-2 text-center text-sm text-red-600">{error}</p>
      )}
    </div>
  );
}
