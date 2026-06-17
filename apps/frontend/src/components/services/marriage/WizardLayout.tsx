'use client';

import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface WizardStep {
  id: number;
  label: string;
  icon: React.ReactNode;
}

interface WizardLayoutProps {
  steps: WizardStep[];
  currentStep: number;
  children: React.ReactNode;
  title: string;
  subtitle?: string;
}

export function WizardLayout({ steps, currentStep, children, title, subtitle }: WizardLayoutProps) {
  const progress = Math.round(((currentStep - 1) / (steps.length - 1)) * 100);

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      {/* Thin progress bar */}
      <div className="h-[3px] bg-gray-100">
        <div
          className="h-full bg-rose-500 transition-all duration-500 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Step dots */}
      <div className="px-6 pt-5 pb-4 border-b border-gray-100">
        <div className="flex items-center">
          {steps.map((step, index) => {
            const done = currentStep > step.id;
            const active = currentStep === step.id;
            const isLast = index === steps.length - 1;

            return (
              <div key={step.id} className={cn('flex items-center', !isLast && 'flex-1')}>
                <div className="flex flex-col items-center gap-1.5">
                  <div
                    className={cn(
                      'w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 shrink-0',
                      done && 'bg-rose-500 text-white',
                      active && 'bg-rose-600 text-white ring-[3px] ring-rose-100 scale-110',
                      !done && !active && 'bg-gray-100 text-gray-400',
                    )}
                  >
                    {done ? <Check className="w-3.5 h-3.5" strokeWidth={3} /> : step.id}
                  </div>
                  <span className={cn(
                    'text-[10px] font-medium hidden sm:block whitespace-nowrap leading-none',
                    active ? 'text-rose-600' : done ? 'text-gray-400' : 'text-gray-300',
                  )}>
                    {step.label}
                  </span>
                </div>

                {!isLast && (
                  <div className={cn(
                    'flex-1 h-px mx-2 mb-4 sm:mb-5 transition-colors duration-300',
                    done ? 'bg-rose-300' : 'bg-gray-200',
                  )} />
                )}
              </div>
            );
          })}
        </div>

        {/* Mobile label */}
        <p className="sm:hidden text-xs text-center text-gray-400 mt-3">
          Step{' '}
          <span className="font-semibold text-rose-600">{currentStep}</span>
          {' '}of {steps.length}
          <span className="text-gray-500"> — {steps.find((s) => s.id === currentStep)?.label}</span>
        </p>
      </div>

      {/* Step header */}
      <div className="px-6 sm:px-8 pt-6 pb-1">
        <h2 className="text-xl font-bold text-gray-900 tracking-tight">{title}</h2>
        {subtitle && <p className="text-sm text-gray-400 mt-1 leading-snug">{subtitle}</p>}
      </div>

      {/* Content */}
      <div className="px-6 sm:px-8 py-6">{children}</div>
    </div>
  );
}
