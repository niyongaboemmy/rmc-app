'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { Bell, Mail, MessageSquare, Save, RefreshCw, Info } from 'lucide-react';
import { Permission } from '@/lib/permissions';
import { useAuth } from '@/contexts/AuthContext';
import { settingsApi, NotificationSetting } from '@/lib/settingsApi';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import { cn } from '@/lib/utils';

type Draft = Record<string, { emailEnabled: boolean; smsEnabled: boolean }>;

export function NotificationsTab() {
  const { hasPermission } = useAuth();
  const canManage = hasPermission(Permission.NOTIFICATION_SETTINGS_MANAGE);
  const toast = useToast();
  const toastRef = useRef(toast);
  toastRef.current = toast;

  const [settings, setSettings] = useState<NotificationSetting[]>([]);
  const [draft,    setDraft]    = useState<Draft>({});
  const [loading,  setLoading]  = useState(true);
  const [saving,   setSaving]   = useState(false);
  const [dirty,    setDirty]    = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await settingsApi.getNotificationSettings();
      setSettings(data);
      const initial: Draft = {};
      for (const s of data) {
        initial[s.eventKey] = { emailEnabled: s.emailEnabled, smsEnabled: s.smsEnabled };
      }
      setDraft(initial);
      setDirty(false);
    } catch {
      toastRef.current.error('Failed to load notification settings.');
    } finally {
      setLoading(false);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { load(); }, [load]);

  const toggle = (eventKey: string, channel: 'emailEnabled' | 'smsEnabled') => {
    if (!canManage) return;
    setDraft((prev) => ({
      ...prev,
      [eventKey]: { ...prev[eventKey], [channel]: !prev[eventKey]?.[channel] },
    }));
    setDirty(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const updates = Object.entries(draft).map(([eventKey, vals]) => ({
        eventKey,
        emailEnabled: vals.emailEnabled,
        smsEnabled: vals.smsEnabled,
      }));
      await settingsApi.updateNotificationSettings({ updates });
      toast.success('Notification preferences saved.');
      await load();
    } catch {
      toast.error('Failed to save notification settings.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-6 h-6 border-2 border-rmc-green border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const grouped = settings.reduce<Record<string, NotificationSetting[]>>((acc, s) => {
    (acc[s.groupName] ??= []).push(s);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      {/* Info banner */}
      <div className="flex items-start gap-3 rounded-xl bg-blue-50 border border-blue-100 px-5 py-4 text-xs text-blue-700">
        <Info className="w-4 h-4 shrink-0 mt-0.5 text-blue-500" />
        <div className="space-y-0.5">
          <p className="font-semibold text-blue-800">Notification Channels</p>
          <p>
            Control whether each system event sends an <strong>Email</strong> or{' '}
            <strong>SMS</strong> to the recipient. Channels marked <em>N/A</em> are not
            applicable for that event type.
          </p>
        </div>
      </div>

      {/* Event groups */}
      {Object.entries(grouped).map(([group, rows]) => (
        <div key={group} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          {/* Group header */}
          <div className="px-6 py-3 border-b border-gray-100 bg-gray-50 flex items-center gap-2">
            <Bell className="w-4 h-4 text-rmc-green" />
            <h3 className="text-sm font-semibold text-gray-800">{group}</h3>
          </div>

          {/* Column headers */}
          <div className="hidden md:grid grid-cols-[1fr_110px_110px] border-b border-gray-100 px-6 py-2">
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Event</span>
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide flex items-center justify-center gap-1">
              <Mail className="w-3 h-3" /> Email
            </span>
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide flex items-center justify-center gap-1">
              <MessageSquare className="w-3 h-3" /> SMS
            </span>
          </div>

          {/* Event rows */}
          <div className="divide-y divide-gray-100">
            {rows.map((s) => {
              const current = draft[s.eventKey] ?? {
                emailEnabled: s.emailEnabled,
                smsEnabled: s.smsEnabled,
              };
              return (
                <div key={s.eventKey} className="px-6 py-4">
                  {/* Desktop layout */}
                  <div className="hidden md:grid grid-cols-[1fr_110px_110px] items-center">
                    <EventInfo s={s} />
                    <div className="flex justify-center">
                      <ChannelCell
                        applicable={s.emailApplicable}
                        enabled={current.emailEnabled}
                        disabled={!canManage}
                        onChange={() => toggle(s.eventKey, 'emailEnabled')}
                      />
                    </div>
                    <div className="flex justify-center">
                      <ChannelCell
                        applicable={s.smsApplicable}
                        enabled={current.smsEnabled}
                        disabled={!canManage}
                        onChange={() => toggle(s.eventKey, 'smsEnabled')}
                      />
                    </div>
                  </div>

                  {/* Mobile layout */}
                  <div className="md:hidden space-y-3">
                    <EventInfo s={s} />
                    <div className="flex items-center gap-6 pt-1">
                      {s.emailApplicable && (
                        <div className="flex items-center gap-2">
                          <Mail className="w-3.5 h-3.5 text-gray-400" />
                          <span className="text-xs text-gray-500">Email</span>
                          <ToggleSwitch
                            enabled={current.emailEnabled}
                            disabled={!canManage}
                            onChange={() => toggle(s.eventKey, 'emailEnabled')}
                          />
                        </div>
                      )}
                      {s.smsApplicable && (
                        <div className="flex items-center gap-2">
                          <MessageSquare className="w-3.5 h-3.5 text-gray-400" />
                          <span className="text-xs text-gray-500">SMS</span>
                          <ToggleSwitch
                            enabled={current.smsEnabled}
                            disabled={!canManage}
                            onChange={() => toggle(s.eventKey, 'smsEnabled')}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {/* Save bar */}
      {canManage && (
        <div className="flex items-center justify-between gap-4 bg-white rounded-xl border border-gray-200 shadow-sm px-6 py-4">
          <button
            onClick={load}
            disabled={loading}
            className="text-xs text-gray-400 hover:text-gray-600 transition-colors flex items-center gap-1.5 disabled:opacity-40"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Reset
          </button>
          <Button
            onClick={handleSave}
            isLoading={saving}
            disabled={!dirty}
            leftIcon={<Save className="w-3.5 h-3.5" />}
          >
            Save Preferences
          </Button>
        </div>
      )}
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function EventInfo({ s }: { s: NotificationSetting }) {
  return (
    <div>
      <p className="text-sm font-medium text-gray-800">{s.label}</p>
      {s.description && (
        <p className="text-xs text-gray-500 mt-0.5">{s.description}</p>
      )}
      <p className="text-[10px] font-mono text-gray-300 mt-1">{s.eventKey}</p>
    </div>
  );
}

function ChannelCell({
  applicable, enabled, disabled, onChange,
}: {
  applicable: boolean;
  enabled: boolean;
  disabled: boolean;
  onChange: () => void;
}) {
  if (!applicable) {
    return <span className="text-xs text-gray-300 italic">N/A</span>;
  }
  return <ToggleSwitch enabled={enabled} disabled={disabled} onChange={onChange} />;
}

function ToggleSwitch({
  enabled, disabled, onChange,
}: {
  enabled: boolean;
  disabled: boolean;
  onChange: () => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={enabled}
      onClick={onChange}
      disabled={disabled}
      className={cn(
        'relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent',
        'transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-rmc-green/30',
        'disabled:cursor-not-allowed disabled:opacity-40',
        enabled ? 'bg-rmc-green' : 'bg-gray-200',
      )}
    >
      <span
        className={cn(
          'pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0',
          'transition duration-200 ease-in-out',
          enabled ? 'translate-x-4' : 'translate-x-0',
        )}
      />
    </button>
  );
}
