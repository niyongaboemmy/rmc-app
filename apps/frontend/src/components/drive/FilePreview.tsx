'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  X, Download, ExternalLink, FileText, Film, Music,
  Image as ImageIcon, File, ZoomIn, ZoomOut, RotateCcw, AlertCircle,
} from 'lucide-react';
import { DriveItem, getFileIcon } from '@/lib/driveApi';
import { apiClient } from '@/lib/api';

interface FilePreviewProps {
  item: DriveItem;
  onClose: () => void;
}

const MAX_PREVIEW_BYTES = 80 * 1024 * 1024; // 80 MB

function useAuthBlob(storageKey: string | null) {
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const revokeRef = useRef<string | null>(null);

  useEffect(() => {
    if (!storageKey) return;
    setLoading(true);
    setError(false);
    setUrl(null);

    apiClient
      .get(`/drive/proxy?key=${encodeURIComponent(storageKey)}`, { responseType: 'blob' })
      .then((res) => {
        const blob = new Blob([res.data as BlobPart], {
          type: (res.headers['content-type'] as string) ?? 'application/octet-stream',
        });
        const objectUrl = URL.createObjectURL(blob);
        revokeRef.current = objectUrl;
        setUrl(objectUrl);
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));

    return () => {
      if (revokeRef.current) {
        URL.revokeObjectURL(revokeRef.current);
        revokeRef.current = null;
      }
    };
  }, [storageKey]);

  return { url, loading, error };
}

export function FilePreview({ item, onClose }: FilePreviewProps) {
  const [scale, setScale] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [mediaLoaded, setMediaLoaded] = useState(false);

  const fileType = getFileIcon(item);
  const tooLarge = !!item.size && item.size > MAX_PREVIEW_BYTES;
  const { url, loading, error } = useAuthBlob(tooLarge ? null : item.storageKey);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  const handleDownload = () => {
    if (!url) return;
    const a = document.createElement('a');
    a.href = url;
    a.download = item.name;
    a.click();
  };

  const renderContent = () => {
    if (tooLarge) {
      return (
        <div className="flex flex-col items-center justify-center h-full gap-4 text-white/80 px-6 text-center">
          <File className="w-16 h-16 opacity-40" />
          <p className="text-lg font-medium">{item.name}</p>
          <p className="text-sm text-white/50">
            File is too large ({formatBytes(item.size ?? 0)}) for inline preview.
          </p>
          <button
            onClick={() => {
              const token = localStorage.getItem('rmc_access_token');
              const base = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api/v1';
              window.open(`${base}/drive/proxy?key=${encodeURIComponent(item.storageKey ?? '')}`, '_blank');
            }}
            className="px-5 py-2.5 bg-white/15 hover:bg-white/25 rounded-xl text-sm font-medium transition-colors flex items-center gap-2"
          >
            <Download className="w-4 h-4" /> Download file
          </button>
        </div>
      );
    }

    if (loading) {
      return (
        <div className="flex flex-col items-center justify-center h-full gap-3">
          <div className="w-10 h-10 border-2 border-rmc-green border-t-transparent rounded-full animate-spin" />
          <p className="text-white/60 text-sm">Loading preview…</p>
        </div>
      );
    }

    if (error || !url) {
      return (
        <div className="flex flex-col items-center justify-center h-full gap-4 text-white/80 px-6 text-center">
          <AlertCircle className="w-14 h-14 opacity-50" />
          <p className="text-base font-medium">Could not load preview</p>
          <p className="text-sm text-white/50">The file server may be unavailable. Try downloading instead.</p>
        </div>
      );
    }

    switch (fileType) {
      case 'image':
        return (
          <div className="flex items-center justify-center h-full overflow-hidden p-4">
            <img
              src={url}
              alt={item.name}
              style={{ transform: `scale(${scale}) rotate(${rotation}deg)`, transition: 'transform 0.2s' }}
              className="max-w-full max-h-full object-contain cursor-zoom-in select-none"
              onLoad={() => setMediaLoaded(true)}
              onClick={() => setScale((s) => Math.min(s + 0.5, 5))}
            />
          </div>
        );

      case 'pdf':
        return (
          <iframe
            src={`${url}#toolbar=1`}
            className="w-full h-full border-0"
            title={item.name}
            onLoad={() => setMediaLoaded(true)}
          />
        );

      case 'video':
        return (
          <div className="flex items-center justify-center h-full bg-black p-2 sm:p-4">
            <video
              src={url}
              controls
              autoPlay={false}
              className="max-w-full max-h-full rounded-lg"
              onLoadedMetadata={() => setMediaLoaded(true)}
            >
              Your browser does not support video playback.
            </video>
          </div>
        );

      case 'audio':
        return (
          <div className="flex flex-col items-center justify-center h-full gap-6 px-6">
            <div className="w-24 h-24 bg-rmc-green/20 rounded-full flex items-center justify-center">
              <Music className="w-10 h-10 text-rmc-green" />
            </div>
            <p className="text-white font-medium text-center max-w-sm">{item.name}</p>
            <audio src={url} controls className="w-full max-w-sm" onLoadedMetadata={() => setMediaLoaded(true)}>
              Your browser does not support audio playback.
            </audio>
          </div>
        );

      case 'text':
        return <TextPreview url={url} onLoad={() => setMediaLoaded(true)} />;

      default:
        return (
          <div className="flex flex-col items-center justify-center h-full gap-4 text-white/80 px-6 text-center">
            <File className="w-16 h-16 opacity-40" />
            <p className="text-lg font-medium">{item.name}</p>
            <p className="text-sm text-white/50">Preview not available for this file type.</p>
            <button
              onClick={handleDownload}
              className="px-5 py-2.5 bg-white/15 hover:bg-white/25 rounded-xl text-sm font-medium transition-colors flex items-center gap-2"
            >
              <Download className="w-4 h-4" /> Download file
            </button>
          </div>
        );
    }
  };

  const modal = (
    <div className="fixed inset-0 z-[99999] flex flex-col bg-black/90 backdrop-blur-md">
      {/* Header */}
      <div className="flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-3 bg-gray-900/80 text-white shrink-0 border-b border-white/10">
        <FileTypeIcon type={fileType} />
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm truncate">{item.name}</p>
          <p className="text-xs text-gray-400 hidden sm:block">
            {item.mimeType || 'Unknown type'}
            {item.size ? ` · ${formatBytes(item.size)}` : ''}
          </p>
        </div>

        <div className="flex items-center gap-0.5 sm:gap-1">
          {fileType === 'image' && !loading && !error && url && (
            <>
              <ToolBtn title="Zoom in" onClick={() => setScale((s) => Math.min(s + 0.5, 5))}>
                <ZoomIn className="w-4 h-4" />
              </ToolBtn>
              <ToolBtn title="Zoom out" onClick={() => setScale((s) => Math.max(s - 0.5, 0.5))}>
                <ZoomOut className="w-4 h-4" />
              </ToolBtn>
              <ToolBtn title="Rotate" onClick={() => setRotation((r) => (r + 90) % 360)}>
                <RotateCcw className="w-4 h-4" />
              </ToolBtn>
            </>
          )}
          {url && !loading && (
            <>
              <ToolBtn title="Download" onClick={handleDownload}>
                <Download className="w-4 h-4" />
              </ToolBtn>
              <ToolBtn
                title="Open in new tab"
                onClick={() => window.open(url, '_blank')}
                className="hidden sm:flex"
              >
                <ExternalLink className="w-4 h-4" />
              </ToolBtn>
            </>
          )}
          <ToolBtn title="Close (Esc)" onClick={onClose} className="hover:bg-red-600/50 ml-1">
            <X className="w-4 h-4" />
          </ToolBtn>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto relative">
        {renderContent()}
      </div>
    </div>
  );

  if (typeof document === 'undefined') return null;
  return createPortal(modal, document.body);
}

function TextPreview({ url, onLoad }: { url: string; onLoad: () => void }) {
  const [text, setText] = useState<string | null>(null);

  useEffect(() => {
    fetch(url)
      .then((r) => r.text())
      .then((t) => { setText(t); onLoad(); })
      .catch(() => setText('Failed to load file content.'));
  }, [url, onLoad]);

  return (
    <div className="h-full overflow-auto bg-gray-950 p-4 sm:p-6">
      <pre className="text-sm font-mono text-green-300 whitespace-pre-wrap break-words leading-relaxed">
        {text ?? 'Loading…'}
      </pre>
    </div>
  );
}

function FileTypeIcon({ type }: { type: string }) {
  const icons: Record<string, React.ReactNode> = {
    image: <ImageIcon className="w-5 h-5 text-blue-400 shrink-0" />,
    video: <Film className="w-5 h-5 text-purple-400 shrink-0" />,
    audio: <Music className="w-5 h-5 text-green-400 shrink-0" />,
    pdf: <FileText className="w-5 h-5 text-red-400 shrink-0" />,
    text: <FileText className="w-5 h-5 text-yellow-400 shrink-0" />,
  };
  return <>{icons[type] ?? <File className="w-5 h-5 text-gray-400 shrink-0" />}</>;
}

function ToolBtn({
  onClick,
  title,
  children,
  className = '',
}: {
  onClick: () => void;
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={`p-1.5 sm:p-2 rounded-md hover:bg-white/10 transition-colors flex items-center justify-center ${className}`}
    >
      {children}
    </button>
  );
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), sizes.length - 1);
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
}
