'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import {
  Sparkles, Eye, EyeOff, Save, RefreshCw, Wifi, WifiOff,
  CheckCircle2, XCircle, Trash2, KeyRound, BadgeCheck,
} from 'lucide-react';
import { Permission } from '@/lib/permissions';
import { useAuth } from '@/contexts/AuthContext';
import { aiSettingsApi, AiSettings, AiProvider, UpdateAiSettingsPayload } from '@/lib/aiSettingsApi';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { useToast } from '@/components/ui/Toast';
import { cn } from '@/lib/utils';

const KEEP = '_KEEP_';

interface FormState {
  defaultProvider: AiProvider;
  openaiKey: string;
  geminiKey: string;
  openaiModel: string;
  geminiModel: string;
}

export function AiSettingsTab() {
  const { hasPermission } = useAuth();
  const canManage = hasPermission(Permission.AI_SETTINGS_MANAGE);
  const toast = useToast();
  const toastRef = useRef(toast);
  toastRef.current = toast;

  const [settings, setSettings] = useState<AiSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toggling, setToggling] = useState(false);
  const [dirty, setDirty] = useState(false);

  const [form, setForm] = useState<FormState>({
    defaultProvider: 'gemini', openaiKey: '', geminiKey: '', openaiModel: '', geminiModel: '',
  });
  const [showOpenai, setShowOpenai] = useState(false);
  const [showGemini, setShowGemini] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await aiSettingsApi.getSettings();
      setSettings(data);
      setForm({
        defaultProvider: data.defaultProvider,
        openaiKey: '',
        geminiKey: '',
        openaiModel: data.openaiModel,
        geminiModel: data.geminiModel,
      });
      setShowOpenai(false);
      setShowGemini(false);
      setDirty(false);
    } catch {
      toastRef.current.error('Failed to load AI assistant settings.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const change = (field: keyof FormState, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setDirty(true);
  };

  const defaultKeySet =
    form.defaultProvider === 'openai'
      ? settings?.openaiKeySet || !!form.openaiKey.trim()
      : settings?.geminiKeySet || !!form.geminiKey.trim();

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload: UpdateAiSettingsPayload = {
        defaultProvider: form.defaultProvider,
        openaiModel: form.openaiModel.trim() || undefined,
        geminiModel: form.geminiModel.trim() || undefined,
        // Typed value → replace; blank → keep what's stored.
        openaiKey: form.openaiKey.trim() ? form.openaiKey.trim() : KEEP,
        geminiKey: form.geminiKey.trim() ? form.geminiKey.trim() : KEEP,
      };
      await aiSettingsApi.updateSettings(payload);
      toast.success('AI assistant settings saved.');
      if (!defaultKeySet) {
        toast.info(`Add a ${form.defaultProvider === 'openai' ? 'OpenAI' : 'Gemini'} API key to enable the assistant.`);
      }
      await load();
    } catch {
      toast.error('Failed to save AI assistant settings.');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async () => {
    if (!settings) return;
    if (!settings.isActive) {
      const keySet = settings.defaultProvider === 'openai' ? settings.openaiKeySet : settings.geminiKeySet;
      if (!keySet) {
        toast.error(`Add a ${settings.defaultProvider === 'openai' ? 'OpenAI' : 'Gemini'} API key and save before enabling.`);
        return;
      }
    }
    setToggling(true);
    try {
      if (settings.isActive) {
        await aiSettingsApi.deactivate();
        toast.info('Assistant disabled.');
      } else {
        await aiSettingsApi.activate();
        toast.success('Assistant enabled.');
      }
      await load();
    } catch {
      toast.error('Failed to change assistant status.');
    } finally {
      setToggling(false);
    }
  };

  const handleClearKey = async (provider: AiProvider) => {
    setSaving(true);
    try {
      await aiSettingsApi.updateSettings(provider === 'openai' ? { openaiKey: '' } : { geminiKey: '' });
      toast.success(`${provider === 'openai' ? 'OpenAI' : 'Gemini'} key removed.`);
      await load();
    } catch {
      toast.error('Failed to remove key.');
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

  return (
    <div className="space-y-6">
      {/* Status banner */}
      {settings && (
        <div className={cn(
          'flex items-center justify-between rounded-xl border px-5 py-4',
          settings.isActive ? 'bg-green-50 border-green-200' : 'bg-amber-50 border-amber-200',
        )}>
          <div className="flex items-center gap-3">
            {settings.isActive
              ? <Wifi className="w-5 h-5 text-green-600" />
              : <WifiOff className="w-5 h-5 text-amber-500" />}
            <div>
              <p className={cn('text-sm font-semibold', settings.isActive ? 'text-green-700' : 'text-amber-700')}>
                {settings.isActive ? 'Assistant Active' : 'Assistant Inactive'}
              </p>
              <p className={cn('text-xs mt-0.5', settings.isActive ? 'text-green-600' : 'text-amber-600')}>
                Default provider: {settings.defaultProvider === 'openai' ? 'OpenAI (GPT)' : 'Google Gemini'}
              </p>
            </div>
          </div>

          {canManage && (
            <Button
              size="sm"
              variant={settings.isActive ? 'danger' : 'primary'}
              onClick={handleToggleActive}
              isLoading={toggling}
              leftIcon={settings.isActive ? <XCircle className="w-3.5 h-3.5" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
            >
              {settings.isActive ? 'Disable' : 'Enable'}
            </Button>
          )}
        </div>
      )}

      {/* Configuration card */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-rmc-green" />
          <h2 className="text-sm font-semibold text-gray-900">Ask AI Assistant</h2>
          <span className="ml-auto text-xs text-gray-400">Replies in English, Kinyarwanda, French &amp; Arabic</span>
        </div>

        <div className="px-6 py-5 space-y-5">
          {/* Default provider */}
          <Select
            label="Default provider"
            required
            value={form.defaultProvider}
            onChange={(e) => change('defaultProvider', e.target.value)}
            disabled={!canManage}
            hint="Which AI provider the website assistant uses to answer visitors."
            options={[
              { value: 'gemini', label: 'Google Gemini — free tier, strong Kinyarwanda' },
              { value: 'openai', label: 'OpenAI (GPT) — paid' },
            ]}
          />

          {/* API keys */}
          <ApiKeyField
            providerLabel="Google Gemini API Key"
            placeholder="AIza…"
            value={form.geminiKey}
            onChange={(v) => change('geminiKey', v)}
            show={showGemini}
            onToggleShow={() => setShowGemini((s) => !s)}
            keySet={!!settings?.geminiKeySet}
            keyHint={settings?.geminiKeyHint ?? ''}
            canManage={canManage}
            onClear={() => handleClearKey('gemini')}
            helpText="Free — create one at aistudio.google.com/apikey (no credit card)."
          />

          <ApiKeyField
            providerLabel="OpenAI API Key"
            placeholder="sk-…"
            value={form.openaiKey}
            onChange={(v) => change('openaiKey', v)}
            show={showOpenai}
            onToggleShow={() => setShowOpenai((s) => !s)}
            keySet={!!settings?.openaiKeySet}
            keyHint={settings?.openaiKeyHint ?? ''}
            canManage={canManage}
            onClear={() => handleClearKey('openai')}
            helpText="Get a key at platform.openai.com/api-keys (paid usage)."
          />

          {/* Models (advanced) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
            <Input
              label="Gemini model"
              value={form.geminiModel}
              onChange={(e) => change('geminiModel', e.target.value)}
              disabled={!canManage}
              placeholder="gemini-2.5-flash"
              hint="e.g. gemini-2.5-flash, gemini-2.5-flash-lite, gemini-2.0-flash"
            />
            <Input
              label="OpenAI model"
              value={form.openaiModel}
              onChange={(e) => change('openaiModel', e.target.value)}
              disabled={!canManage}
              placeholder="gpt-4o-mini"
              hint="e.g. gpt-4o-mini, gpt-4o"
            />
          </div>
        </div>

        {canManage && (
          <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex items-center justify-between gap-3">
            <button
              onClick={load}
              className="text-xs text-gray-400 hover:text-gray-600 transition-colors flex items-center gap-1"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Reset
            </button>
            <Button onClick={handleSave} isLoading={saving} disabled={!dirty} leftIcon={<Save className="w-3.5 h-3.5" />}>
              Save Changes
            </Button>
          </div>
        )}
      </div>

      {/* Info box */}
      <div className="rounded-xl bg-blue-50 border border-blue-100 px-5 py-4 text-xs text-blue-700 space-y-1.5">
        <p className="font-semibold text-blue-800">How it works</p>
        <p>API keys are stored AES-256 encrypted in the database and used only on the server — they are never sent to the browser or stored in environment variables.</p>
        <p>The assistant answers from the RMC website knowledge base and replies in the visitor&apos;s own language (English, Kinyarwanda, French, or Arabic).</p>
      </div>
    </div>
  );
}

// ─── Reusable masked API-key field ────────────────────────────────────────────

interface ApiKeyFieldProps {
  providerLabel: string;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  show: boolean;
  onToggleShow: () => void;
  keySet: boolean;
  keyHint: string;
  canManage: boolean;
  onClear: () => void;
  helpText: string;
}

function ApiKeyField({
  providerLabel, placeholder, value, onChange, show, onToggleShow,
  keySet, keyHint, canManage, onClear, helpText,
}: ApiKeyFieldProps) {
  return (
    <div>
      <Input
        label={providerLabel}
        type={show ? 'text' : 'password'}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={!canManage}
        placeholder={keySet ? '•••••••••• (leave blank to keep)' : placeholder}
        leftIcon={<KeyRound className="w-4 h-4" />}
        hint={keySet ? `${helpText} A key is saved — type a new one to replace it.` : helpText}
        rightIcon={
          <button
            type="button"
            onClick={onToggleShow}
            title={show ? 'Hide' : 'Show'}
            className="text-gray-400 hover:text-rmc-green transition-colors"
            tabIndex={-1}
          >
            {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        }
      />
      <div className="flex items-center gap-3 mt-1.5">
        {keySet ? (
          <span className="flex items-center gap-1.5 text-xs text-gray-500">
            <BadgeCheck className="w-3.5 h-3.5 text-green-500" />
            Saved {keyHint} · encrypted
          </span>
        ) : (
          <span className="flex items-center gap-1.5 text-xs text-amber-600">
            <XCircle className="w-3.5 h-3.5" />
            No key set
          </span>
        )}
        {keySet && canManage && (
          <button
            onClick={onClear}
            className="flex items-center gap-1 text-xs text-gray-400 hover:text-red-500 transition-colors"
          >
            <Trash2 className="w-3 h-3" /> Remove
          </button>
        )}
      </div>
    </div>
  );
}
