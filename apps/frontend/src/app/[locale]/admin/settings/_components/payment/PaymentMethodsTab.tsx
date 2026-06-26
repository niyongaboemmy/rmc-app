'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  Smartphone, Building2, CreditCard, Banknote,
  CheckCircle2, XCircle, Settings2, RefreshCw,
} from 'lucide-react';
import { Permission } from '@/lib/permissions';
import { useAuth } from '@/contexts/AuthContext';
import {
  paymentSettingsApi,
  PaymentMethod,
  PaymentMethodCode,
} from '@/lib/paymentSettingsApi';
import { useToast } from '@/components/ui/Toast';
import { cn } from '@/lib/utils';

const METHOD_ICONS: Record<PaymentMethodCode, React.ElementType> = {
  MOMO_INTOUCH:  Smartphone,
  BANK_TRANSFER: Building2,
  CARD:          CreditCard,
  CASH:          Banknote,
};

const METHOD_COLORS: Record<PaymentMethodCode, string> = {
  MOMO_INTOUCH:  'from-yellow-400 to-orange-400',
  BANK_TRANSFER: 'from-blue-500 to-blue-600',
  CARD:          'from-purple-500 to-purple-600',
  CASH:          'from-green-500 to-green-600',
};

interface Props {
  onConfigureClick: (method: PaymentMethod) => void;
}

export function PaymentMethodsTab({ onConfigureClick }: Props) {
  const { hasPermission } = useAuth();
  const canManage = hasPermission(Permission.PAYMENT_SETTINGS_MANAGE);
  const toast = useToast();

  const [methods, setMethods] = useState<PaymentMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setMethods(await paymentSettingsApi.listMethods());
    } catch {
      toast.error('Failed to load payment methods.');
    } finally {
      setLoading(false);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { load(); }, [load]);

  const handleToggle = async (method: PaymentMethod) => {
    setToggling(method.id);
    try {
      const updated = await paymentSettingsApi.toggleMethod(method.id);
      setMethods((prev) => prev.map((m) => (m.id === updated.id ? updated : m)));
      toast.success(`${updated.name} ${updated.isActive ? 'activated' : 'deactivated'}.`);
    } catch {
      toast.error('Failed to update payment method.');
    } finally {
      setToggling(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-6 h-6 border-2 border-rmc-green border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Summary banner */}
      <div className="rounded-xl bg-blue-50 border border-blue-100 px-5 py-3.5 flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center shrink-0">
          <Settings2 className="w-4 h-4 text-blue-600" />
        </div>
        <p className="text-sm text-blue-700">
          Enable the payment channels you want to accept. Configure credentials in the{' '}
          <span className="font-semibold">Credentials</span> tab for each active method.
        </p>
        <button
          onClick={load}
          className="ml-auto p-1.5 rounded-lg text-blue-400 hover:text-blue-600 hover:bg-blue-100 transition-colors"
          title="Refresh"
        >
          <RefreshCw className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Cards grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {methods.map((method) => {
          const Icon = METHOD_ICONS[method.code] ?? Banknote;
          const gradient = METHOD_COLORS[method.code] ?? 'from-gray-400 to-gray-500';
          const isToggling = toggling === method.id;

          return (
            <div
              key={method.id}
              className={cn(
                'relative bg-white rounded-2xl border shadow-sm overflow-hidden transition-all duration-200',
                method.isActive
                  ? 'border-rmc-green/30 shadow-rmc-green/5'
                  : 'border-gray-200 opacity-70',
              )}
            >
              {/* Gradient header strip */}
              <div className={cn('h-1.5 w-full bg-gradient-to-r', gradient)} />

              <div className="p-5 space-y-4">
                {/* Icon + active badge */}
                <div className="flex items-start justify-between">
                  <div className={cn(
                    'w-11 h-11 rounded-xl bg-gradient-to-br flex items-center justify-center shrink-0',
                    gradient,
                  )}>
                    <Icon className="w-5 h-5 text-white" />
                  </div>
                  <span className={cn(
                    'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium',
                    method.isActive
                      ? 'bg-green-100 text-green-700'
                      : 'bg-gray-100 text-gray-500',
                  )}>
                    {method.isActive
                      ? <><CheckCircle2 className="w-3 h-3" /> Active</>
                      : <><XCircle className="w-3 h-3" /> Inactive</>
                    }
                  </span>
                </div>

                {/* Name + description */}
                <div>
                  <h3 className="text-sm font-semibold text-gray-900">{method.name}</h3>
                  {method.description && (
                    <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{method.description}</p>
                  )}
                </div>

                {/* Action buttons */}
                {canManage && (
                  <div className="flex gap-2 pt-1">
                    <button
                      onClick={() => handleToggle(method)}
                      disabled={isToggling}
                      className={cn(
                        'flex-1 text-xs font-medium py-1.5 px-3 rounded-lg border transition-all',
                        method.isActive
                          ? 'border-red-200 text-red-600 hover:bg-red-50'
                          : 'border-rmc-green/40 text-rmc-green hover:bg-rmc-green/5',
                        isToggling && 'opacity-50 cursor-not-allowed',
                      )}
                    >
                      {isToggling ? '...' : method.isActive ? 'Deactivate' : 'Activate'}
                    </button>
                    <button
                      onClick={() => onConfigureClick(method)}
                      className="flex items-center gap-1 text-xs font-medium py-1.5 px-3 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
                    >
                      <Settings2 className="w-3 h-3" />
                      Config
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
