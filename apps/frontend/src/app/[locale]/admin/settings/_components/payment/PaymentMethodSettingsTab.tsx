'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import {
  Smartphone, Building2, CreditCard, Banknote,
  Save, RefreshCw, Eye, EyeOff, CheckCircle2, XCircle,
  Lock, AlertCircle, FlaskConical, Globe,
} from 'lucide-react';
import { Permission } from '@/lib/permissions';
import { useAuth } from '@/contexts/AuthContext';
import {
  paymentSettingsApi,
  PaymentMethod,
  PaymentMethodSettings,
  PaymentMethodCode,
  PAYMENT_METHOD_FIELDS,
  SettingField,
} from '@/lib/paymentSettingsApi';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { useToast } from '@/components/ui/Toast';
import { Modal, ModalHeader, ModalBody, ModalFooter, ModalTitle } from '@/components/ui/Modal';
import { cn } from '@/lib/utils';

const METHOD_ICONS: Record<PaymentMethodCode, React.ElementType> = {
  MOMO_INTOUCH:  Smartphone,
  BANK_TRANSFER: Building2,
  CARD:          CreditCard,
  CASH:          Banknote,
};

interface Props {
  initialMethod?: PaymentMethod | null;
  methods: PaymentMethod[];
}

export function PaymentMethodSettingsTab({ initialMethod, methods }: Props) {
  const { hasPermission, user, login } = useAuth();
  const canManage = hasPermission(Permission.PAYMENT_SETTINGS_MANAGE);
  const toast = useToast();
  const toastRef = useRef(toast);
  toastRef.current = toast;

  const [selectedMethodId, setSelectedMethodId] = useState<string>(
    initialMethod?.id ?? methods[0]?.id ?? '',
  );
  const [settings, setSettings] = useState<PaymentMethodSettings | null>(null);
  const [form, setForm] = useState<Record<string, string>>({});
  const [isTestMode, setIsTestMode] = useState(true);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [revealedFields, setRevealedFields] = useState<Set<string>>(new Set());

  // Password-confirm modal for revealing sensitive fields
  const [revealTarget, setRevealTarget] = useState<string | null>(null);
  const [revealModalOpen, setRevealModalOpen] = useState(false);
  const [adminPassword, setAdminPassword] = useState('');
  const [revealError, setRevealError] = useState('');
  const [revealLoading, setRevealLoading] = useState(false);

  const selectedMethod = methods.find((m) => m.id === selectedMethodId) ?? null;
  const fields: SettingField[] = selectedMethod
    ? (PAYMENT_METHOD_FIELDS[selectedMethod.code] ?? [])
    : [];

  const load = useCallback(async () => {
    if (!selectedMethodId) return;
    setLoading(true);
    try {
      const s = await paymentSettingsApi.getMethodSettings(selectedMethodId);
      setSettings(s);
      setForm(s.settings ?? {});
      setIsTestMode(s.isTestMode);
      setDirty(false);
      setRevealedFields(new Set());
    } catch {
      toastRef.current.error('Failed to load payment method settings.');
    } finally {
      setLoading(false);
    }
  }, [selectedMethodId]);

  useEffect(() => { load(); }, [load]);

  // When parent signals a method to focus
  useEffect(() => {
    if (initialMethod?.id) setSelectedMethodId(initialMethod.id);
  }, [initialMethod]);

  const handleFieldChange = (key: string, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setDirty(true);
  };

  const handleSave = async () => {
    if (!selectedMethodId) return;
    setSaving(true);
    try {
      await paymentSettingsApi.upsertMethodSettings(selectedMethodId, {
        settings: form,
        isTestMode,
      });
      toast.success('Payment settings saved successfully.');
      await load();
    } catch {
      toast.error('Failed to save payment settings.');
    } finally {
      setSaving(false);
    }
  };

  const openRevealModal = (fieldKey: string) => {
    if (revealedFields.has(fieldKey)) {
      setRevealedFields((prev) => { const n = new Set(prev); n.delete(fieldKey); return n; });
      return;
    }
    setRevealTarget(fieldKey);
    setAdminPassword('');
    setRevealError('');
    setRevealModalOpen(true);
  };

  const handleRevealConfirm = async () => {
    if (!adminPassword.trim()) { setRevealError('Please enter your password.'); return; }
    setRevealLoading(true);
    setRevealError('');
    try {
      await login(user?.email ?? '', adminPassword);
      if (revealTarget) {
        setRevealedFields((prev) => new Set(Array.from(prev).concat(revealTarget)));
      }
      setRevealModalOpen(false);
    } catch {
      setRevealError('Incorrect password. Please try again.');
    } finally {
      setRevealLoading(false);
    }
  };

  // ── Render helpers ─────────────────────────────────────────────────────────

  const renderField = (field: SettingField) => {
    const value = form[field.key] ?? '';
    const isRevealed = revealedFields.has(field.key);
    const isSensitive = !!field.sensitive;

    if (field.type === 'select') {
      return (
        <Select
          key={field.key}
          label={field.label}
          required={field.required}
          value={value}
          onChange={(e) => handleFieldChange(field.key, e.target.value)}
          disabled={!canManage}
          options={field.options ?? []}
          placeholder="Select an option"
          hint={field.hint}
        />
      );
    }

    return (
      <div key={field.key}>
        <Input
          label={field.label}
          required={field.required}
          type={isSensitive && !isRevealed ? 'password' : 'text'}
          value={value}
          onChange={(e) => handleFieldChange(field.key, e.target.value)}
          disabled={!canManage}
          placeholder={field.placeholder}
          hint={field.hint}
          rightIcon={
            isSensitive ? (
              <button
                type="button"
                onClick={() => openRevealModal(field.key)}
                className="text-gray-400 hover:text-rmc-green transition-colors"
                tabIndex={-1}
                title={isRevealed ? 'Hide' : 'Reveal'}
              >
                {isRevealed ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            ) : undefined
          }
        />
        {isSensitive && !isRevealed && value && (
          <div className="flex items-center gap-1.5 mt-1">
            <Lock className="w-3 h-3 text-rmc-green" />
            <span className="text-xs text-gray-400">Stored securely · click eye to reveal</span>
          </div>
        )}
      </div>
    );
  };

  // Split fields into grid pairs (2 per row)
  const renderFieldsGrid = () => {
    const rows: SettingField[][] = [];
    let i = 0;
    while (i < fields.length) {
      // Long-text / URL fields take full width
      const f = fields[i];
      if (f.type === 'url' || f.type === 'text' || f.sensitive) {
        rows.push([f]);
        i += 1;
      } else {
        rows.push(fields.slice(i, i + 2));
        i += 2;
      }
    }
    return rows.map((row, idx) => (
      <div
        key={idx}
        className={cn('grid gap-4', row.length === 2 ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1')}
      >
        {row.map(renderField)}
      </div>
    ));
  };

  return (
    <>
      <div className="space-y-5">
        {/* Method selector */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-5 py-3.5 border-b border-gray-100 flex items-center gap-2">
            <Globe className="w-4 h-4 text-rmc-green" />
            <span className="text-sm font-semibold text-gray-900">Select Payment Method</span>
          </div>
          <div className="p-4 flex flex-wrap gap-2">
            {methods.map((m) => {
              const Icon = METHOD_ICONS[m.code] ?? Banknote;
              const active = m.id === selectedMethodId;
              return (
                <button
                  key={m.id}
                  onClick={() => { setSelectedMethodId(m.id); setDirty(false); }}
                  className={cn(
                    'flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium border transition-all',
                    active
                      ? 'bg-rmc-green text-white border-rmc-green shadow-sm'
                      : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300 hover:bg-gray-50',
                    !m.isActive && 'opacity-60',
                  )}
                >
                  <Icon className="w-4 h-4" />
                  {m.name}
                  {!m.isActive && (
                    <span className={cn(
                      'text-xs px-1.5 py-0.5 rounded-full',
                      active ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-400',
                    )}>
                      off
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {selectedMethod && (
          <>
            {/* Config status + test mode */}
            <div className={cn(
              'flex items-center justify-between rounded-xl border px-5 py-4',
              settings?.isConfigured
                ? 'bg-green-50 border-green-200'
                : 'bg-amber-50 border-amber-200',
            )}>
              <div className="flex items-center gap-3">
                {settings?.isConfigured
                  ? <CheckCircle2 className="w-5 h-5 text-green-600" />
                  : <XCircle className="w-5 h-5 text-amber-500" />
                }
                <div>
                  <p className={cn(
                    'text-sm font-semibold',
                    settings?.isConfigured ? 'text-green-700' : 'text-amber-700',
                  )}>
                    {settings?.isConfigured ? 'Credentials configured' : 'Not yet configured'}
                  </p>
                  <p className="text-xs mt-0.5 text-gray-500">
                    {settings?.isConfigured
                      ? 'All required credentials are set. This method is ready to process payments.'
                      : 'Fill in all required fields below and save to activate this payment method.'}
                  </p>
                </div>
              </div>

              {canManage && (
                <label className="flex items-center gap-2 cursor-pointer ml-4">
                  <span className="flex items-center gap-1 text-xs font-medium text-gray-500">
                    <FlaskConical className="w-3.5 h-3.5" />
                    Test mode
                  </span>
                  <div
                    onClick={() => { setIsTestMode((v) => !v); setDirty(true); }}
                    className={cn(
                      'relative w-9 h-5 rounded-full transition-colors cursor-pointer',
                      isTestMode ? 'bg-amber-400' : 'bg-rmc-green',
                    )}
                  >
                    <span className={cn(
                      'absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform',
                      isTestMode ? 'translate-x-0' : 'translate-x-4',
                    )} />
                  </div>
                </label>
              )}
            </div>

            {/* Settings form */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
                {(() => { const Icon = METHOD_ICONS[selectedMethod.code] ?? Banknote; return <Icon className="w-4 h-4 text-rmc-green" />; })()}
                <h2 className="text-sm font-semibold text-gray-900">{selectedMethod.name} — Credentials</h2>
                {isTestMode && (
                  <span className="ml-auto inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-xs font-medium">
                    <FlaskConical className="w-3 h-3" />
                    Test Mode
                  </span>
                )}
              </div>

              <div className="px-6 py-5 space-y-4">
                {loading ? (
                  <div className="flex items-center justify-center py-10">
                    <div className="w-5 h-5 border-2 border-rmc-green border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : fields.length === 0 ? (
                  <p className="text-sm text-gray-400 py-4 text-center">No configuration required for this payment method.</p>
                ) : (
                  renderFieldsGrid()
                )}
              </div>

              {canManage && !loading && (
                <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex items-center justify-between gap-3">
                  <button
                    onClick={load}
                    className="text-xs text-gray-400 hover:text-gray-600 transition-colors flex items-center gap-1"
                  >
                    <RefreshCw className="w-3.5 h-3.5" /> Reset
                  </button>
                  <Button
                    onClick={handleSave}
                    isLoading={saving}
                    disabled={!dirty}
                    leftIcon={<Save className="w-3.5 h-3.5" />}
                  >
                    Save Credentials
                  </Button>
                </div>
              )}
            </div>

            {/* IntouchPay notes */}
            {selectedMethod.code === 'MOMO_INTOUCH' && (
              <div className="rounded-xl bg-blue-50 border border-blue-100 px-5 py-4 text-xs text-blue-700 space-y-1.5">
                <p className="font-semibold text-blue-800">How IntouchPay works</p>
                <p>The gateway password is computed per-request as <code className="bg-blue-100 px-1 rounded font-mono">SHA256(username + accountno + partnerpassword + timestamp)</code> — never stored as the final password.</p>
                <p>Enable <strong>Test Mode</strong> to route payments through the sandbox. Disable it only when you have live credentials from IntouchPay.</p>
              </div>
            )}
          </>
        )}
      </div>

      {/* Confirm identity modal */}
      <ConfirmPasswordModal
        open={revealModalOpen}
        loading={revealLoading}
        error={revealError}
        adminPassword={adminPassword}
        onPasswordChange={(v) => { setAdminPassword(v); setRevealError(''); }}
        onConfirm={handleRevealConfirm}
        onClose={() => setRevealModalOpen(false)}
      />
    </>
  );
}

// ─── Confirm Password Modal ────────────────────────────────────────────────────

interface ConfirmPasswordModalProps {
  open: boolean;
  loading: boolean;
  error: string;
  adminPassword: string;
  onPasswordChange: (v: string) => void;
  onConfirm: () => void;
  onClose: () => void;
}

function ConfirmPasswordModal({
  open, loading, error, adminPassword, onPasswordChange, onConfirm, onClose,
}: ConfirmPasswordModalProps) {
  const [show, setShow] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) { setShow(false); setTimeout(() => inputRef.current?.focus(), 50); }
  }, [open]);

  return (
    <Modal open={open} onClose={onClose} size="sm">
      <ModalHeader>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center shrink-0">
            <Lock className="w-4 h-4 text-amber-600" />
          </div>
          <div>
            <ModalTitle>Confirm Your Identity</ModalTitle>
            <p className="text-xs text-gray-500 mt-0.5">Enter your admin password to reveal this credential</p>
          </div>
        </div>
      </ModalHeader>

      <ModalBody>
        <div className="space-y-4 pt-1">
          <Input
            ref={inputRef}
            label="Your account password"
            type={show ? 'text' : 'password'}
            value={adminPassword}
            onChange={(e) => onPasswordChange(e.target.value)}
            error={error}
            placeholder="Enter your login password"
            rightIcon={
              <button type="button" onClick={() => setShow((v) => !v)} className="text-gray-400 hover:text-gray-600" tabIndex={-1}>
                {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            }
            onKeyDown={(e) => { if (e.key === 'Enter') onConfirm(); }}
          />
          <div className="flex items-start gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2.5">
            <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
            <span>This is a sensitive operation. Your identity is verified before revealing payment credentials.</span>
          </div>
        </div>
      </ModalBody>

      <ModalFooter>
        <Button variant="ghost" onClick={onClose} disabled={loading}>Cancel</Button>
        <Button onClick={onConfirm} isLoading={loading} leftIcon={<Eye className="w-3.5 h-3.5" />}>
          Reveal Credential
        </Button>
      </ModalFooter>
    </Modal>
  );
}
