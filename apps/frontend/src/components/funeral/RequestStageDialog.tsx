'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Check } from 'lucide-react';
import { FuneralModal } from './FuneralModal';
import { type FuneralRequest, type FuneralStepConfig } from './types';

/** Manage a funeral request: update its lifecycle stage (rebuilds the timeline on save). */
export function RequestStageDialog({
  request,
  steps,
  stageLabel,
  onSave,
  onClose,
}: {
  request: FuneralRequest;
  steps: FuneralStepConfig[];
  stageLabel: (s: string) => string;
  onSave: (stage: string) => void;
  onClose: () => void;
}) {
  const t = useTranslations('admin.funeral.requests.dialog');
  const [stage, setStage] = useState<string>(request.stage);
  const currentIdx = steps.findIndex((s) => s.key === request.stage);

  return (
    <FuneralModal
      title={t('title')}
      subtitle={request.deceased.fullName}
      onClose={onClose}
      closeLabel={t('cancel')}
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-600 transition-colors hover:bg-gray-50"
          >
            {t('cancel')}
          </button>
          <button
            type="button"
            onClick={() => onSave(stage)}
            disabled={stage === request.stage}
            className="inline-flex items-center gap-1.5 rounded-full bg-rmc-green px-5 py-2 text-sm font-bold text-white shadow-sm transition-colors hover:bg-rmc-green-dark disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Check className="h-4 w-4" aria-hidden="true" /> {t('save')}
          </button>
        </>
      }
    >
      {/* Stage */}
      <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.12em] text-gray-400">{t('stageLabel')}</p>
      <div className="space-y-1.5">
        {steps.map((s, i) => {
          const done = currentIdx !== -1 && i < currentIdx;
          return (
            <label
              key={s.key}
              className="flex cursor-pointer items-center gap-3 rounded-xl border border-gray-200 px-3 py-2.5 text-[13px] text-gray-700 transition-colors has-[:checked]:border-rmc-green has-[:checked]:bg-rmc-green-light/40 has-[:checked]:font-semibold has-[:checked]:text-rmc-green-dark"
            >
              <input
                type="radio"
                name="request-stage"
                value={s.key}
                checked={stage === s.key}
                onChange={() => setStage(s.key)}
                className="accent-rmc-green"
              />
              {s.color && <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: s.color }} aria-hidden="true" />}
              <span className="flex-1">{stageLabel(s.key)}</span>
              {done && <Check className="h-3.5 w-3.5 text-rmc-green/60" aria-hidden="true" />}
              {s.key === request.stage && (
                <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-bold text-gray-500">
                  {t('current')}
                </span>
              )}
            </label>
          );
        })}
      </div>
    </FuneralModal>
  );
}
