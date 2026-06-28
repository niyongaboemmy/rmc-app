'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { Upload, Plus, Trash2, Save, RefreshCw, Info, FileType } from 'lucide-react';
import { Permission } from '@/lib/permissions';
import { useAuth } from '@/contexts/AuthContext';
import { uploadSettingsApi, UploadSettings } from '@/lib/uploadSettingsApi';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';

// Common MIME type suggestions grouped by category
const MIME_SUGGESTIONS: { label: string; types: { mime: string; label: string }[] }[] = [
  {
    label: 'Images',
    types: [
      { mime: 'image/jpeg', label: 'JPEG' },
      { mime: 'image/png', label: 'PNG' },
      { mime: 'image/webp', label: 'WebP' },
      { mime: 'image/gif', label: 'GIF' },
      { mime: 'image/svg+xml', label: 'SVG' },
    ],
  },
  {
    label: 'Documents',
    types: [
      { mime: 'application/pdf', label: 'PDF' },
      { mime: 'application/msword', label: 'DOC' },
      {
        mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        label: 'DOCX',
      },
      { mime: 'application/vnd.ms-excel', label: 'XLS' },
      { mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', label: 'XLSX' },
      { mime: 'application/vnd.ms-powerpoint', label: 'PPT' },
      {
        mime: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        label: 'PPTX',
      },
      { mime: 'text/plain', label: 'TXT' },
      { mime: 'text/csv', label: 'CSV' },
    ],
  },
  {
    label: 'Archives',
    types: [
      { mime: 'application/zip', label: 'ZIP' },
      { mime: 'application/x-rar-compressed', label: 'RAR' },
      { mime: 'application/x-7z-compressed', label: '7Z' },
      { mime: 'application/gzip', label: 'GZ' },
    ],
  },
  {
    label: 'Video',
    types: [
      { mime: 'video/mp4', label: 'MP4' },
      { mime: 'video/webm', label: 'WebM' },
      { mime: 'video/quicktime', label: 'MOV' },
      { mime: 'video/x-msvideo', label: 'AVI' },
    ],
  },
  {
    label: 'Audio',
    types: [
      { mime: 'audio/mpeg', label: 'MP3' },
      { mime: 'audio/wav', label: 'WAV' },
      { mime: 'audio/ogg', label: 'OGG' },
      { mime: 'audio/aac', label: 'AAC' },
    ],
  },
];

function formatBytes(bytes: number): string {
  if (bytes <= 0) return 'Unlimited';
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), sizes.length - 1);
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
}

function bytesFromMB(mb: number): number {
  return Math.round(mb * 1024 * 1024);
}

export function UploadSettingsTab() {
  const { hasPermission } = useAuth();
  const canManage = hasPermission(Permission.UPLOAD_SETTINGS_MANAGE);
  const toast = useToast();
  const toastRef = useRef(toast);
  toastRef.current = toast;

  const [settings, setSettings] = useState<UploadSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingSize, setSavingSize] = useState(false);
  const [addingMime, setAddingMime] = useState(false);
  const [removingMime, setRemovingMime] = useState<string | null>(null);

  const [maxSizeMB, setMaxSizeMB] = useState('500');
  const [customMime, setCustomMime] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await uploadSettingsApi.get();
      setSettings(data);
      setMaxSizeMB(data.maxFileSize > 0 ? String(Math.round(data.maxFileSize / 1024 / 1024)) : '0');
    } catch {
      toastRef.current.error('Failed to load upload settings.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleSaveSize = async () => {
    const mb = parseFloat(maxSizeMB);
    if (isNaN(mb) || mb < 0) {
      toast.error('Enter a valid size in MB (0 = unlimited).');
      return;
    }
    setSavingSize(true);
    try {
      const updated = await uploadSettingsApi.updateMaxFileSize(bytesFromMB(mb));
      setSettings(updated);
      toast.success('Max file size updated.');
    } catch {
      toast.error('Failed to update max file size.');
    } finally {
      setSavingSize(false);
    }
  };

  const handleAddMime = async (mime: string) => {
    const normalized = mime.trim().toLowerCase();
    if (!normalized) return;
    if (settings?.allowedMimeTypes.includes(normalized)) {
      toast.info(`"${normalized}" is already in the list.`);
      return;
    }
    setAddingMime(true);
    try {
      const updated = await uploadSettingsApi.addMimeType(normalized);
      setSettings(updated);
      setCustomMime('');
      setShowSuggestions(false);
      toast.success(`"${normalized}" added.`);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(msg || 'Failed to add MIME type.');
    } finally {
      setAddingMime(false);
    }
  };

  const handleRemoveMime = async (mime: string) => {
    setRemovingMime(mime);
    try {
      const updated = await uploadSettingsApi.removeMimeType(mime);
      setSettings(updated);
      toast.success(`"${mime}" removed.`);
    } catch {
      toast.error('Failed to remove MIME type.');
    } finally {
      setRemovingMime(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-6 h-6 border-2 border-rmc-green border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const allowedMimeTypes = settings?.allowedMimeTypes ?? [];
  const allAllowed = allowedMimeTypes.length === 0;

  return (
    <div className="space-y-6">
      {/* Info banner */}
      <div className="flex items-start gap-3 rounded-xl bg-blue-50 border border-blue-100 px-5 py-4">
        <Info className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" />
        <div className="text-xs text-blue-700 space-y-1">
          <p className="font-semibold text-blue-800">How upload settings work</p>
          <p>
            These settings are stored in the database and enforced by the file server on every
            upload. Changes apply immediately — no server restart needed.
          </p>
          <p>
            <strong>Allowed MIME types:</strong> An empty list means{' '}
            <em>all file types are accepted</em>. Add specific types to restrict uploads to only
            those formats.
          </p>
        </div>
      </div>

      {/* Max file size card */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
          <Upload className="w-4 h-4 text-rmc-green" />
          <h2 className="text-sm font-semibold text-gray-900">Maximum File Size</h2>
          {settings && (
            <span className="ml-auto text-xs font-medium text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
              Current: {formatBytes(settings.maxFileSize)}
            </span>
          )}
        </div>
        <div className="px-6 py-5 space-y-4">
          <div className="max-w-xs space-y-1">
            <label className="block text-sm font-medium text-gray-700">Max size (MB)</label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={0}
                value={maxSizeMB}
                onChange={(e) => setMaxSizeMB(e.target.value)}
                disabled={!canManage}
                placeholder="800"
                className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-rmc-green focus:border-transparent outline-none disabled:bg-gray-50 disabled:text-gray-400"
              />
              {canManage && (
                <Button
                  onClick={handleSaveSize}
                  isLoading={savingSize}
                  leftIcon={<Save className="w-3.5 h-3.5" />}
                >
                  Save
                </Button>
              )}
            </div>
            <p className="text-xs text-gray-400">Set to 0 for no limit. The file server enforces this on upload.</p>
          </div>

          {/* Quick presets */}
          {canManage && (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-gray-400">Quick presets:</span>
              {[10, 50, 100, 250, 500, 1024].map((mb) => (
                <button
                  key={mb}
                  onClick={() => setMaxSizeMB(String(mb))}
                  className="text-xs px-2.5 py-1 rounded-lg border border-gray-200 hover:border-rmc-green hover:text-rmc-green transition-colors"
                >
                  {mb >= 1024 ? '1 GB' : `${mb} MB`}
                </button>
              ))}
              <button
                onClick={() => setMaxSizeMB('0')}
                className="text-xs px-2.5 py-1 rounded-lg border border-gray-200 hover:border-rmc-green hover:text-rmc-green transition-colors"
              >
                Unlimited
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Allowed MIME types card */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
          <FileType className="w-4 h-4 text-rmc-green" />
          <h2 className="text-sm font-semibold text-gray-900">Allowed File Types</h2>
          <span
            className={`ml-auto text-xs font-medium px-2 py-0.5 rounded-full ${
              allAllowed ? 'text-green-700 bg-green-50' : 'text-gray-600 bg-gray-100'
            }`}
          >
            {allAllowed
              ? 'All types allowed'
              : `${allowedMimeTypes.length} type${allowedMimeTypes.length !== 1 ? 's' : ''} allowed`}
          </span>
        </div>

        <div className="px-6 py-5 space-y-5">
          {/* Current allowed types */}
          {allAllowed ? (
            <div className="rounded-lg bg-green-50 border border-green-100 px-4 py-3 text-sm text-green-700">
              No restrictions — any file type can be uploaded. Add MIME types below to restrict
              uploads.
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {allowedMimeTypes.map((mime) => (
                <span
                  key={mime}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700 border border-gray-200"
                >
                  {mime}
                  {canManage && (
                    <button
                      onClick={() => handleRemoveMime(mime)}
                      disabled={removingMime === mime}
                      className="text-gray-400 hover:text-red-500 transition-colors disabled:opacity-40"
                      title={`Remove ${mime}`}
                    >
                      {removingMime === mime ? (
                        <span className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin inline-block" />
                      ) : (
                        <Trash2 className="w-3 h-3" />
                      )}
                    </button>
                  )}
                </span>
              ))}
            </div>
          )}

          {/* Add custom MIME type */}
          {canManage && (
            <div className="space-y-3">
              <div className="max-w-sm space-y-1">
                <label className="block text-sm font-medium text-gray-700">Add MIME type</label>
                <div className="flex items-center gap-2">
                  <input
                    value={customMime}
                    onChange={(e) => setCustomMime(e.target.value)}
                    placeholder="e.g. application/zip"
                    onKeyDown={(e) => { if (e.key === 'Enter') handleAddMime(customMime); }}
                    className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-rmc-green focus:border-transparent outline-none"
                  />
                  <Button
                    onClick={() => handleAddMime(customMime)}
                    isLoading={addingMime}
                    disabled={!customMime.trim()}
                    leftIcon={<Plus className="w-3.5 h-3.5" />}
                  >
                    Add
                  </Button>
                </div>
                <p className="text-xs text-gray-400">Enter a valid MIME type in type/subtype format.</p>
              </div>

              {/* Quick add from suggestions */}
              <div>
                <button
                  onClick={() => setShowSuggestions((s) => !s)}
                  className="flex items-center gap-1.5 text-xs text-rmc-green hover:underline"
                >
                  <Plus className="w-3.5 h-3.5" />
                  {showSuggestions ? 'Hide suggestions' : 'Browse common MIME types'}
                </button>

                {showSuggestions && (
                  <div className="mt-3 space-y-3">
                    {MIME_SUGGESTIONS.map((group) => (
                      <div key={group.label}>
                        <p className="text-xs font-semibold text-gray-500 mb-1.5">{group.label}</p>
                        <div className="flex flex-wrap gap-1.5">
                          {group.types.map((t) => {
                            const already = allowedMimeTypes.includes(t.mime);
                            return (
                              <button
                                key={t.mime}
                                onClick={() => !already && handleAddMime(t.mime)}
                                disabled={already || addingMime !== false}
                                title={t.mime}
                                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border text-xs transition-colors ${
                                  already
                                    ? 'border-rmc-green bg-rmc-green/5 text-rmc-green cursor-default'
                                    : 'border-gray-200 text-gray-600 hover:border-rmc-green hover:text-rmc-green hover:bg-rmc-green/5 disabled:opacity-50'
                                }`}
                              >
                                {already && <span className="text-rmc-green">✓</span>}
                                {t.label}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-gray-50 border-t border-gray-100 flex items-center gap-2">
          <button
            onClick={load}
            className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-600 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Refresh
          </button>
          {settings && (
            <span className="ml-auto text-xs text-gray-400">
              Last updated: {new Date(settings.updatedAt).toLocaleString()}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
