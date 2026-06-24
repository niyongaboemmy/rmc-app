'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import {
  MessageSquare, Eye, EyeOff, RefreshCw,
  CheckCircle2, XCircle, Wifi, WifiOff, Save, RotateCcw,
  Lock, AlertCircle, BadgeCheck,
} from 'lucide-react';
import { Permission } from '@/lib/permissions';
import { useAuth } from '@/contexts/AuthContext';
import { settingsApi, SmsConfig, UpdateSmsConfigPayload } from '@/lib/settingsApi';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useToast } from '@/components/ui/Toast';
import { Modal, ModalHeader, ModalBody, ModalFooter, ModalTitle } from '@/components/ui/Modal';
import { cn } from '@/lib/utils';

export function SmsConfigTab() {
  const { hasPermission, user, login } = useAuth();
  const canManage = hasPermission(Permission.SMS_CONFIG_MANAGE);
  const toast = useToast();
  const toastRef = useRef(toast);
  toastRef.current = toast;

  const [config, setConfig] = useState<SmsConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toggling, setToggling] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [dirty, setDirty] = useState(false);

  const [form, setForm] = useState<UpdateSmsConfigPayload>({
    username: '', password: '', senderName: 'RMC', dlrUrl: '', isActive: false,
  });

  const [passwordVisible, setPasswordVisible] = useState(false);
  const [revealModalOpen, setRevealModalOpen] = useState(false);
  const [adminPassword, setAdminPassword] = useState('');
  const [revealError, setRevealError] = useState('');
  const [revealLoading, setRevealLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await settingsApi.getSmsConfig();
      setConfig(data);
      setForm({
        username: data.username,
        password: data.password ?? '',
        senderName: data.senderName,
        dlrUrl: data.dlrUrl ?? '',
        isActive: data.isActive,
      });
      setPasswordVisible(false);
      setDirty(false);
    } catch {
      toastRef.current.error('Failed to load SMS configuration.');
    } finally {
      setLoading(false);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { load(); }, [load]);

  const handleChange = (field: keyof UpdateSmsConfigPayload, value: string | boolean) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setDirty(true);
  };

  const handleSave = async () => {
    if (!form.username.trim()) { toast.error('Username is required.'); return; }
    if (!form.password.trim()) { toast.error('Password is required.'); return; }
    setSaving(true);
    try {
      await settingsApi.updateSmsConfig({ ...form, password: form.password.trim() });
      toast.success('SMS configuration saved successfully.');
      await load();
    } catch {
      toast.error('Failed to save SMS configuration.');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async () => {
    if (!config) return;
    setToggling(true);
    try {
      if (config.isActive) {
        await settingsApi.deactivateSms();
        toast.info('SMS gateway deactivated.');
      } else {
        await settingsApi.activateSms();
        toast.success('SMS gateway activated.');
      }
      await load();
    } catch {
      toast.error('Failed to toggle SMS gateway status.');
    } finally {
      setToggling(false);
    }
  };

  const handleRefreshCache = async () => {
    setRefreshing(true);
    try {
      await settingsApi.refreshSmsCache();
      toast.success('SMS config cache refreshed.');
    } catch {
      toast.error('Failed to refresh cache.');
    } finally {
      setRefreshing(false);
    }
  };

  const openRevealModal = () => {
    if (passwordVisible) { setPasswordVisible(false); return; }
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
      setPasswordVisible(true);
      setRevealModalOpen(false);
    } catch {
      setRevealError('Incorrect password. Please try again.');
    } finally {
      setRevealLoading(false);
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
    <>
      <div className="space-y-6">
        {/* Status banner */}
        {config && (
          <div className={cn(
            'flex items-center justify-between rounded-xl border px-5 py-4',
            config.isActive ? 'bg-green-50 border-green-200' : 'bg-amber-50 border-amber-200',
          )}>
            <div className="flex items-center gap-3">
              {config.isActive
                ? <Wifi className="w-5 h-5 text-green-600" />
                : <WifiOff className="w-5 h-5 text-amber-500" />
              }
              <div>
                <p className={cn('text-sm font-semibold', config.isActive ? 'text-green-700' : 'text-amber-700')}>
                  {config.isActive ? 'Gateway Active' : 'Gateway Inactive'}
                </p>
                {config.isActive && config.balanceRwf && (
                  <p className="text-xs text-green-600 mt-0.5">
                    Balance: {parseFloat(config.balanceRwf).toLocaleString()} RWF
                    {config.balanceUpdatedAt && (
                      <span className="text-green-500 ml-1">
                        · updated {new Date(config.balanceUpdatedAt).toLocaleString()}
                      </span>
                    )}
                  </p>
                )}
              </div>
            </div>

            {canManage && (
              <div className="flex items-center gap-2">
                <button
                  onClick={handleRefreshCache}
                  disabled={refreshing}
                  title="Refresh in-memory cache"
                  className="p-2 rounded-lg text-gray-500 hover:text-gray-700 hover:bg-white/60 transition-colors disabled:opacity-50"
                >
                  <RotateCcw className={cn('w-4 h-4', refreshing && 'animate-spin')} />
                </button>
                <Button
                  size="sm"
                  variant={config.isActive ? 'danger' : 'primary'}
                  onClick={handleToggleActive}
                  isLoading={toggling}
                  leftIcon={config.isActive
                    ? <XCircle className="w-3.5 h-3.5" />
                    : <CheckCircle2 className="w-3.5 h-3.5" />}
                >
                  {config.isActive ? 'Deactivate' : 'Activate'}
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Configuration card */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-rmc-green" />
            <h2 className="text-sm font-semibold text-gray-900">InTouch SMS Gateway</h2>
            <span className="ml-auto text-xs text-gray-400">intouchsms.co.rw</span>
          </div>

          <div className="px-6 py-5 space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Username"
                required
                value={form.username}
                onChange={(e) => handleChange('username', e.target.value)}
                disabled={!canManage}
                placeholder="RMC"
                hint="Your InTouch account username"
              />
              <Input
                label="Sender Name"
                value={form.senderName}
                onChange={(e) => handleChange('senderName', e.target.value)}
                disabled={!canManage}
                placeholder="RMC"
                maxLength={11}
                hint="Alpha-numeric, max 11 chars"
              />
            </div>

            <div>
              <Input
                label="Password"
                required
                type={passwordVisible ? 'text' : 'password'}
                value={form.password}
                onChange={(e) => handleChange('password', e.target.value)}
                disabled={!canManage}
                placeholder="Enter InTouch password"
                hint={
                  passwordVisible
                    ? 'Password is visible. Click the eye icon to hide.'
                    : 'Click the eye icon and confirm your admin password to reveal.'
                }
                rightIcon={
                  <button
                    type="button"
                    onClick={openRevealModal}
                    title={passwordVisible ? 'Hide password' : 'Reveal password'}
                    className="text-gray-400 hover:text-rmc-green transition-colors"
                    tabIndex={-1}
                  >
                    {passwordVisible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                }
              />
              {!passwordVisible && config?.passwordSet && (
                <div className="flex items-center gap-1.5 mt-1.5">
                  <Lock className="w-3 h-3 text-rmc-green" />
                  <span className="text-xs text-gray-500">Stored encrypted · click eye to reveal</span>
                </div>
              )}
            </div>

            <Input
              label="Delivery Report URL (optional)"
              value={form.dlrUrl ?? ''}
              onChange={(e) => handleChange('dlrUrl', e.target.value)}
              disabled={!canManage}
              placeholder="https://api.rmc.org.rw/api/v1/webhooks/sms-delivery"
              hint="InTouch will send a GET request to this URL with delivery status updates"
            />

            {config && (
              <div className="flex items-center gap-2 text-xs pt-1">
                {config.passwordSet
                  ? <><BadgeCheck className="w-3.5 h-3.5 text-green-500" /><span className="text-gray-500">Password is configured and encrypted</span></>
                  : <><XCircle className="w-3.5 h-3.5 text-red-400" /><span className="text-red-500">No password set — gateway is non-functional</span></>
                }
              </div>
            )}
          </div>

          {canManage && (
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
                Save Changes
              </Button>
            </div>
          )}
        </div>

        {/* Info box */}
        <div className="rounded-xl bg-blue-50 border border-blue-100 px-5 py-4 text-xs text-blue-700 space-y-1.5">
          <p className="font-semibold text-blue-800">How it works</p>
          <p>Credentials are stored AES-256 encrypted in the database. The gateway password is never stored in environment variables.</p>
          <p>After saving, the active config is cached in memory — use <span className="font-mono bg-blue-100 px-1 rounded">Refresh Cache</span> if another server instance is running.</p>
        </div>
      </div>

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

// ─── Confirm Password Modal ───────────────────────────────────────────────────

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
            <p className="text-xs text-gray-500 mt-0.5">Enter your admin password to reveal the SMS gateway password</p>
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
            <span>This is a sensitive action. Your identity is verified before revealing gateway credentials.</span>
          </div>
        </div>
      </ModalBody>

      <ModalFooter>
        <Button variant="ghost" onClick={onClose} disabled={loading}>Cancel</Button>
        <Button onClick={onConfirm} isLoading={loading} leftIcon={<Eye className="w-3.5 h-3.5" />}>
          Reveal Password
        </Button>
      </ModalFooter>
    </Modal>
  );
}
