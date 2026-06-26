'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  Heart, Diamond, Users, GraduationCap, CalendarDays, Star,
  Info, ToggleLeft, ToggleRight, ChevronDown, ChevronRight,
  Pencil, Plus, Trash2, Check, X, RefreshCw,
} from 'lucide-react';
import { Permission } from '@/lib/permissions';
import { useAuth } from '@/contexts/AuthContext';
import {
  paymentSettingsApi,
  PaymentType,
  PaymentTypeRate,
  PaymentTypeKey,
  UpsertPaymentTypeRatePayload,
} from '@/lib/paymentSettingsApi';
import { useToast } from '@/components/ui/Toast';
import { cn } from '@/lib/utils';

// ── Icons / Colors ─────────────────────────────────────────────────────────────

const TYPE_ICONS: Record<PaymentTypeKey, React.ElementType> = {
  DONATION:       Heart,
  MARRIAGE_FEE:   Diamond,
  MEMBERSHIP_FEE: Users,
  SCHOOL_FEE:     GraduationCap,
  EVENT_FEE:      CalendarDays,
  ZAKAT:          Star,
};

const TYPE_COLORS: Record<PaymentTypeKey, string> = {
  DONATION:       'bg-rose-100 text-rose-600',
  MARRIAGE_FEE:   'bg-pink-100 text-pink-600',
  MEMBERSHIP_FEE: 'bg-blue-100 text-blue-600',
  SCHOOL_FEE:     'bg-amber-100 text-amber-600',
  EVENT_FEE:      'bg-violet-100 text-violet-600',
  ZAKAT:          'bg-teal-100 text-teal-600',
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtAmount(n: number | null | undefined) {
  if (n == null) return null;
  return new Intl.NumberFormat('rw-RW').format(Number(n)) + ' RWF';
}

// ── Inline amount / field editor ──────────────────────────────────────────────

interface InlineEditProps {
  value: string;
  onSave: (v: string) => Promise<void>;
  inputClass?: string;
  type?: string;
  placeholder?: string;
  prefix?: string;
  suffix?: string;
}

function InlineEdit({ value, onSave, inputClass, type = 'text', placeholder, prefix, suffix }: InlineEditProps) {
  const [editing, setEditing] = useState(false);
  const [draft,   setDraft]   = useState(value);
  const [loading, setLoading] = useState(false);

  const commit = async () => {
    if (draft === value) { setEditing(false); return; }
    setLoading(true);
    try {
      await onSave(draft);
      setEditing(false);
    } finally {
      setLoading(false);
    }
  };

  if (!editing) {
    return (
      <button
        onClick={() => { setDraft(value); setEditing(true); }}
        className="group inline-flex items-center gap-1 hover:text-violet-700 transition-colors"
      >
        {prefix && <span className="text-slate-400">{prefix}</span>}
        <span>{value || <span className="text-slate-400 italic">—</span>}</span>
        {suffix && <span className="text-slate-400">{suffix}</span>}
        <Pencil className="w-3 h-3 opacity-0 group-hover:opacity-60 ml-0.5" />
      </button>
    );
  }

  return (
    <div className="flex items-center gap-1">
      {prefix && <span className="text-slate-400 text-xs">{prefix}</span>}
      <input
        autoFocus
        type={type}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') setEditing(false); }}
        placeholder={placeholder}
        className={cn(
          'px-2 py-0.5 rounded border border-violet-300 focus:outline-none focus:ring-2 focus:ring-violet-400 text-sm',
          inputClass,
        )}
      />
      {suffix && <span className="text-slate-400 text-xs">{suffix}</span>}
      <button onClick={commit} disabled={loading} className="text-emerald-600 hover:text-emerald-800 transition-colors">
        {loading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
      </button>
      <button onClick={() => setEditing(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

// ── Rate row ──────────────────────────────────────────────────────────────────

interface RateRowProps {
  rate: PaymentTypeRate;
  typeId: string;
  canManage: boolean;
  onChange: (updated: PaymentTypeRate) => void;
  onDelete: (rateId: string) => void;
}

function RateRow({ rate, typeId, canManage, onChange, onDelete }: RateRowProps) {
  const toast   = useToast();
  const [deleting, setDeleting] = useState(false);

  const save = async (patch: Partial<UpsertPaymentTypeRatePayload>) => {
    try {
      const updated = await paymentSettingsApi.updateRate(typeId, rate.id, {
        name:        rate.name,
        amount:      rate.amount,
        description: rate.description ?? undefined,
        isActive:    rate.isActive,
        sortOrder:   rate.sortOrder,
        code:        rate.code ?? undefined,
        ...patch,
      });
      onChange(updated);
    } catch {
      toast.error('Failed to update rate');
      throw new Error('save failed');
    }
  };

  const toggle = async () => {
    try {
      const updated = await paymentSettingsApi.toggleRate(typeId, rate.id);
      onChange(updated);
    } catch {
      toast.error('Failed to toggle rate');
    }
  };

  const handleDelete = async () => {
    if (!confirm(`Delete "${rate.name}"? This cannot be undone.`)) return;
    setDeleting(true);
    try {
      await paymentSettingsApi.deleteRate(typeId, rate.id);
      onDelete(rate.id);
    } catch {
      toast.error('Failed to delete rate');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className={cn(
      'flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-colors',
      rate.isActive ? 'bg-white border-slate-200' : 'bg-slate-50 border-slate-100 opacity-60',
    )}>
      {/* Name */}
      <div className="flex-1 min-w-0">
        {canManage ? (
          <InlineEdit
            value={rate.name}
            onSave={(v) => save({ name: v })}
            inputClass="w-40"
            placeholder="Rate name"
          />
        ) : (
          <span className="text-sm font-medium text-slate-700">{rate.name}</span>
        )}
        {rate.description && (
          <p className="text-[10px] text-slate-400 mt-0.5 truncate">{rate.description}</p>
        )}
      </div>

      {/* Amount */}
      <div className="shrink-0 text-right">
        {canManage ? (
          <InlineEdit
            value={String(Number(rate.amount))}
            type="number"
            onSave={(v) => save({ amount: parseFloat(v) })}
            inputClass="w-24 text-right"
            suffix=" RWF"
          />
        ) : (
          <span className="text-sm font-semibold text-slate-800">{fmtAmount(rate.amount)}</span>
        )}
      </div>

      {/* Status badge */}
      <span className={cn(
        'shrink-0 text-[10px] font-medium px-2 py-0.5 rounded-full',
        rate.isActive ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-500',
      )}>
        {rate.isActive ? 'Active' : 'Inactive'}
      </span>

      {canManage && (
        <div className="shrink-0 flex items-center gap-1">
          <button onClick={toggle} className="p-1 rounded hover:bg-slate-100 text-slate-500 hover:text-slate-700 transition-colors">
            {rate.isActive
              ? <ToggleRight className="w-4 h-4 text-emerald-600" />
              : <ToggleLeft  className="w-4 h-4" />}
          </button>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="p-1 rounded hover:bg-red-50 text-slate-400 hover:text-red-600 transition-colors"
          >
            {deleting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
          </button>
        </div>
      )}
    </div>
  );
}

// ── Add Rate Form ─────────────────────────────────────────────────────────────

interface AddRateFormProps {
  typeId: string;
  onAdded: (rate: PaymentTypeRate) => void;
  onCancel: () => void;
}

function AddRateForm({ typeId, onAdded, onCancel }: AddRateFormProps) {
  const toast = useToast();
  const [name,   setName]   = useState('');
  const [amount, setAmount] = useState('');
  const [desc,   setDesc]   = useState('');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!name.trim() || !amount) return;
    setSaving(true);
    try {
      const rate = await paymentSettingsApi.createRate(typeId, {
        name:        name.trim(),
        amount:      parseFloat(amount),
        description: desc.trim() || undefined,
      });
      onAdded(rate);
    } catch {
      toast.error('Failed to add rate');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-2 p-3 rounded-xl border border-dashed border-violet-300 bg-violet-50/40">
      <div className="grid grid-cols-2 gap-2">
        <input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Rate name (e.g. Mosque Ceremony)"
          className="col-span-2 px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
        />
        <input
          value={amount}
          type="number"
          min={1}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="Amount (RWF)"
          className="px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
        />
        <input
          value={desc}
          onChange={(e) => setDesc(e.target.value)}
          placeholder="Description (optional)"
          className="px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
        />
      </div>
      <div className="flex gap-2 justify-end">
        <button onClick={onCancel} className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-800 transition-colors">Cancel</button>
        <button
          onClick={handleSave}
          disabled={!name.trim() || !amount || saving}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-violet-600 text-white text-xs font-semibold disabled:opacity-50 transition-colors hover:bg-violet-700"
        >
          {saving ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
          Add Rate
        </button>
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export function PaymentTypesTab() {
  const { hasPermission } = useAuth();
  const toast      = useToast();
  const canManage  = hasPermission(Permission.PAYMENT_SETTINGS_MANAGE);

  const [types,    setTypes]    = useState<PaymentType[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [addingTo, setAddingTo] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await paymentSettingsApi.listTypes();
      setTypes(data);
      // Auto-expand types that have rates
      setExpanded(new Set(data.filter((t) => t.rates?.length > 0).map((t) => t.id)));
    } catch {
      toast.error('Failed to load service areas');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  const toggleExpanded = (id: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const handleToggleType = async (id: string) => {
    try {
      const updated = await paymentSettingsApi.toggleType(id);
      setTypes((prev) => prev.map((t) => (t.id === id ? { ...t, ...updated } : t)));
    } catch {
      toast.error('Failed to toggle service area');
    }
  };

  const handleUpdateType = async (id: string, patch: { name?: string; description?: string; amount?: number }) => {
    const updated = await paymentSettingsApi.updateType(id, patch);
    setTypes((prev) => prev.map((t) => (t.id === id ? { ...t, ...updated } : t)));
  };

  const handleRateChange = (typeId: string, updated: PaymentTypeRate) => {
    setTypes((prev) => prev.map((t) => {
      if (t.id !== typeId) return t;
      return { ...t, rates: t.rates.map((r) => (r.id === updated.id ? updated : r)) };
    }));
  };

  const handleRateDelete = (typeId: string, rateId: string) => {
    setTypes((prev) => prev.map((t) => {
      if (t.id !== typeId) return t;
      return { ...t, rates: t.rates.filter((r) => r.id !== rateId) };
    }));
  };

  const handleRateAdded = (typeId: string, rate: PaymentTypeRate) => {
    setTypes((prev) => prev.map((t) => {
      if (t.id !== typeId) return t;
      return { ...t, rates: [...(t.rates ?? []), rate] };
    }));
    setAddingTo(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48 text-slate-400 gap-2">
        <RefreshCw className="w-4 h-4 animate-spin" /> Loading…
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Header notice */}
      <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-sm text-amber-800">
        <Info className="w-4 h-4 shrink-0 mt-0.5" />
        <span>
          <strong>Service areas</strong> control which parts of the platform accept online payments.
          Keys are fixed and referenced in the application code — only enable/disable as needed.
          Amounts and sub-categories can be updated freely.
        </span>
      </div>

      {/* Type rows */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="grid grid-cols-[auto_1fr_auto_auto_auto] items-center px-4 py-2.5 border-b border-slate-100 bg-slate-50/60 text-[10px] uppercase tracking-wide text-slate-500 font-medium gap-4">
          <span></span>
          <span>Service Area</span>
          <span className="w-36 text-right">Default Amount</span>
          <span className="w-28 text-right pr-2">Status</span>
          <span className="w-8"></span>
        </div>

        <div className="divide-y divide-slate-100">
          {types.map((type) => {
            const Icon      = TYPE_ICONS[type.key] ?? Star;
            const colorCls  = TYPE_COLORS[type.key] ?? 'bg-slate-100 text-slate-600';
            const isOpen    = expanded.has(type.id);
            const hasRates  = (type.rates?.length ?? 0) > 0;

            return (
              <div key={type.id}>
                {/* Type row */}
                <div className="grid grid-cols-[auto_1fr_auto_auto_auto] items-center px-4 py-3.5 gap-4 hover:bg-slate-50/50 transition-colors">
                  {/* Icon */}
                  <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center shrink-0', colorCls)}>
                    <Icon className="w-4 h-4" />
                  </div>

                  {/* Name + key + description */}
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      {canManage ? (
                        <InlineEdit
                          value={type.name}
                          onSave={(v) => handleUpdateType(type.id, { name: v })}
                          inputClass="w-44"
                        />
                      ) : (
                        <span className="font-semibold text-slate-800 text-sm">{type.name}</span>
                      )}
                      <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-slate-100 text-slate-500 text-[10px] font-mono font-medium border border-slate-200">
                        {type.key}
                      </span>
                    </div>
                    <div className="mt-0.5">
                      {canManage ? (
                        <InlineEdit
                          value={type.description ?? ''}
                          onSave={(v) => handleUpdateType(type.id, { description: v })}
                          inputClass="w-64 text-xs"
                          placeholder="Add description…"
                        />
                      ) : (
                        <p className="text-xs text-slate-500">{type.description}</p>
                      )}
                    </div>
                  </div>

                  {/* Default amount */}
                  <div className="w-36 text-right shrink-0">
                    {hasRates ? (
                      <span className="text-xs text-slate-400 italic">see rates ↓</span>
                    ) : canManage ? (
                      <InlineEdit
                        value={type.amount != null ? String(Number(type.amount)) : ''}
                        type="number"
                        onSave={(v) => handleUpdateType(type.id, { amount: parseFloat(v) || 0 })}
                        inputClass="w-24 text-right"
                        suffix=" RWF"
                        placeholder="0"
                      />
                    ) : (
                      <span className="text-sm font-semibold text-slate-700">
                        {fmtAmount(type.amount) ?? <span className="text-slate-400">—</span>}
                      </span>
                    )}
                  </div>

                  {/* Toggle */}
                  <div className="w-28 flex items-center justify-end gap-2 shrink-0">
                    <span className={cn(
                      'text-xs font-medium',
                      type.isActive ? 'text-emerald-700' : 'text-slate-400',
                    )}>
                      {type.isActive ? 'Enabled' : 'Disabled'}
                    </span>
                    {canManage && (
                      <button
                        onClick={() => handleToggleType(type.id)}
                        className="shrink-0 transition-colors"
                      >
                        {type.isActive
                          ? <ToggleRight className="w-7 h-7 text-emerald-500 hover:text-emerald-600" />
                          : <ToggleLeft  className="w-7 h-7 text-slate-300 hover:text-slate-400" />}
                      </button>
                    )}
                  </div>

                  {/* Expand / collapse rates */}
                  <div className="w-8 flex justify-center shrink-0">
                    <button
                      onClick={() => toggleExpanded(type.id)}
                      className={cn(
                        'w-6 h-6 rounded-md flex items-center justify-center transition-colors',
                        hasRates || canManage
                          ? 'text-slate-400 hover:bg-slate-100 hover:text-slate-700'
                          : 'invisible',
                      )}
                    >
                      {isOpen
                        ? <ChevronDown    className="w-3.5 h-3.5" />
                        : <ChevronRight   className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                {/* Rates section */}
                {isOpen && (
                  <div className="px-5 pb-4 pt-1 bg-slate-50/40 border-t border-slate-100 space-y-2">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-[11px] uppercase tracking-wide text-slate-500 font-semibold">
                        Sub-categories / Pricing Tiers
                      </p>
                      {canManage && addingTo !== type.id && (
                        <button
                          onClick={() => setAddingTo(type.id)}
                          className="flex items-center gap-1 text-[11px] font-medium text-violet-600 hover:text-violet-800 transition-colors"
                        >
                          <Plus className="w-3 h-3" /> Add tier
                        </button>
                      )}
                    </div>

                    {(type.rates ?? []).length === 0 && addingTo !== type.id && (
                      <p className="text-xs text-slate-400 italic py-1">
                        No pricing tiers yet. {canManage ? 'Click "Add tier" to create one.' : ''}
                      </p>
                    )}

                    {(type.rates ?? [])
                      .slice()
                      .sort((a, b) => a.sortOrder - b.sortOrder)
                      .map((rate) => (
                        <RateRow
                          key={rate.id}
                          rate={rate}
                          typeId={type.id}
                          canManage={canManage}
                          onChange={(updated) => handleRateChange(type.id, updated)}
                          onDelete={(rateId) => handleRateDelete(type.id, rateId)}
                        />
                      ))}

                    {addingTo === type.id && (
                      <AddRateForm
                        typeId={type.id}
                        onAdded={(rate) => handleRateAdded(type.id, rate)}
                        onCancel={() => setAddingTo(null)}
                      />
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
