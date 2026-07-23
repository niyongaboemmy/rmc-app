'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { useTranslations } from 'next-intl';
import {
  X, Download, ExternalLink, FileText, Image as ImageIcon,
  File as FileIcon, ZoomIn, ZoomOut, RotateCcw, Eye,
} from 'lucide-react';
import { PreviewOverlayShell, OverlayToolButton as ToolBtn } from './PreviewOverlayShell';
import { cn } from '@/lib/utils';

/**
 * Let someone see what they just attached, before they submit it.
 *
 * Every public application form (Hajj, Jobs, Scholarship, Tender, Marriage,
 * Funeral) asks for receipts, IDs and certificates, and until now a wrong file
 * was only discovered by an admin days later. This renders the picked file
 * full-screen: images zoom and rotate, PDFs open in the browser's own viewer,
 * and anything the browser genuinely cannot render (.doc/.docx) says so
 * honestly and offers a download rather than faking a preview.
 *
 * The main entry point previews the LOCAL `File` the user picked — never a
 * server round-trip. That matters for the forms that upload on pick (Hajj,
 * Tender, Funeral): their stored files are not publicly readable, so the file
 * in hand is the only copy we can show. Those forms therefore keep the `File`
 * after uploading it, purely for this. {@link ImagePreviewTrigger} covers the
 * other case — an image already stored at a public URL (the CMS fields).
 *
 * The overlay behaviour (portal, Esc, scroll-lock, focus trap) comes from
 * PreviewOverlayShell — the same shell the Drive viewer and Library use.
 */

type PreviewKind = 'image' | 'pdf' | 'other';

/** What the overlay actually renders: a resolved URL plus how to display it. */
interface PreviewSource {
  url: string;
  name: string;
  kind: PreviewKind;
  /** Omitted for an already-stored file, whose byte size we do not know here. */
  size?: number;
}

/** Trust the MIME type, but fall back to the extension when it is missing —
 *  some browsers report an empty `type` for files picked off certain devices. */
function kindOf(file: File): PreviewKind {
  const mime = file.type.toLowerCase();
  if (mime.startsWith('image/')) return 'image';
  if (mime === 'application/pdf') return 'pdf';
  if (mime) return 'other';

  const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
  if (['jpg', 'jpeg', 'png', 'webp', 'gif', 'heic', 'heif', 'avif'].includes(ext)) return 'image';
  if (ext === 'pdf') return 'pdf';
  return 'other';
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), sizes.length - 1);
  return `${(bytes / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 1)} ${sizes[i]}`;
}

const MIN_SCALE = 0.5;
const MAX_SCALE = 5;
const SCALE_STEP = 0.5;

function PreviewOverlay({ source, onClose }: { source: PreviewSource; onClose: () => void }) {
  const t = useTranslations('common.filePreview');
  const [scale, setScale] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [failed, setFailed] = useState(false);

  const { url, name, kind, size } = source;

  const download = () => {
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    a.click();
  };

  const body = () => {
    if (kind === 'image' && !failed) {
      return (
        <div className="flex h-full items-center justify-center overflow-auto p-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={url}
            alt={name}
            style={{ transform: `scale(${scale}) rotate(${rotation}deg)`, transition: 'transform 0.2s' }}
            className="max-h-full max-w-full select-none object-contain"
            onError={() => setFailed(true)}
          />
        </div>
      );
    }

    if (kind === 'pdf' && !failed) {
      return (
        <iframe
          src={url}
          title={name}
          className="h-full w-full border-0 bg-white"
          onError={() => setFailed(true)}
        />
      );
    }

    // .doc/.docx and anything else a browser cannot render inline. Saying so is
    // more useful than an empty frame, which reads as a broken page.
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 px-6 text-center text-white/80">
        <FileIcon className="h-16 w-16 opacity-40" aria-hidden="true" />
        <p className="max-w-sm break-words text-base font-medium">{name}</p>
        <p className="max-w-sm text-sm text-white/50">{t('unsupported')}</p>
        <button
          type="button"
          onClick={download}
          className="flex items-center gap-2 rounded-lg bg-white/15 px-5 py-2.5 text-sm font-medium transition-colors hover:bg-white/25"
        >
          <Download className="h-4 w-4" aria-hidden="true" /> {t('download')}
        </button>
      </div>
    );
  };

  const isImage = kind === 'image' && !failed;

  return (
    <PreviewOverlayShell
      onClose={onClose}
      label={name}
      className="flex flex-col bg-black/90 backdrop-blur-md"
    >
      <div className="flex shrink-0 items-center gap-2 border-b border-white/10 bg-gray-900/80 px-3 py-3 text-white sm:gap-3 sm:px-4">
        {kind === 'image' ? (
          <ImageIcon className="h-5 w-5 shrink-0 text-blue-400" aria-hidden="true" />
        ) : kind === 'pdf' ? (
          <FileText className="h-5 w-5 shrink-0 text-red-400" aria-hidden="true" />
        ) : (
          <FileIcon className="h-5 w-5 shrink-0 text-gray-400" aria-hidden="true" />
        )}

        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{name}</p>
          {size != null && (
            <p className="hidden text-xs text-gray-400 sm:block">{formatBytes(size)}</p>
          )}
        </div>

        <div className="flex items-center gap-0.5 sm:gap-1">
          {isImage && (
            <>
              <ToolBtn title={t('zoomIn')} onClick={() => setScale((s) => Math.min(s + SCALE_STEP, MAX_SCALE))}>
                <ZoomIn className="h-4 w-4" />
              </ToolBtn>
              <ToolBtn title={t('zoomOut')} onClick={() => setScale((s) => Math.max(s - SCALE_STEP, MIN_SCALE))}>
                <ZoomOut className="h-4 w-4" />
              </ToolBtn>
              <ToolBtn title={t('rotate')} onClick={() => setRotation((r) => (r + 90) % 360)}>
                <RotateCcw className="h-4 w-4" />
              </ToolBtn>
            </>
          )}
          <ToolBtn title={t('download')} onClick={download}>
            <Download className="h-4 w-4" />
          </ToolBtn>
          {/* Always available: the surest escape hatch when an inline PDF viewer
              is unavailable (notably older iOS Safari). */}
          <ToolBtn
            title={t('openInNewTab')}
            onClick={() => window.open(url, '_blank', 'noopener')}
            className="hidden sm:flex"
          >
            <ExternalLink className="h-4 w-4" />
          </ToolBtn>
          <ToolBtn title={t('close')} onClick={onClose} className="ml-1 hover:bg-red-600/50">
            <X className="h-4 w-4" />
          </ToolBtn>
        </div>
      </div>

      <div className="relative flex-1 overflow-hidden">{body()}</div>
    </PreviewOverlayShell>
  );
}

/** Full-screen preview of a locally picked file. */
export function FilePreviewOverlay({ file, onClose }: { file: File; onClose: () => void }) {
  // Created in an effect rather than during render so a re-render can never
  // leak a second object URL; revoked when the overlay closes.
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    const objectUrl = URL.createObjectURL(file);
    setUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [file]);

  if (!url) return null;
  return (
    <PreviewOverlay
      source={{ url, name: file.name, kind: kindOf(file), size: file.size }}
      onClose={onClose}
    />
  );
}

function TriggerButton({
  onOpen, label, className, children,
}: {
  onOpen: () => void; label: string; className?: string; children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onOpen}
      title={label}
      aria-label={label}
      className={cn('shrink-0 transition-colors', className)}
    >
      {children}
    </button>
  );
}

/**
 * A button that opens {@link FilePreviewOverlay} for `file`, owning the open
 * state itself so a form field only has to drop it next to its Change/Remove
 * controls. Renders nothing when there is no file — which is how a slot seeded
 * from an already-submitted application degrades, rather than offering a
 * preview that cannot load.
 */
export function FilePreviewTrigger({
  file,
  className,
  children,
  label,
}: {
  file: File | null | undefined;
  className?: string;
  /** Defaults to an eye icon; pass content to make the trigger a thumbnail. */
  children?: ReactNode;
  /** Overrides the accessible name (defaults to the translated "Preview"). */
  label?: string;
}) {
  const t = useTranslations('common.filePreview');
  const [open, setOpen] = useState(false);

  if (!file) return null;

  return (
    <>
      <TriggerButton onOpen={() => setOpen(true)} label={label ?? t('preview')} className={className}>
        {children ?? <Eye className="h-4 w-4" aria-hidden="true" />}
      </TriggerButton>
      {open && <FilePreviewOverlay file={file} onClose={() => setOpen(false)} />}
    </>
  );
}

/**
 * The same preview for an image that is ALREADY stored at a readable URL — the
 * CMS image fields, whose thumbnails are `object-cover` cropped and so hide
 * part of what was uploaded. Use {@link FilePreviewTrigger} whenever a local
 * `File` is available; it works before an upload finishes and needs no network.
 */
export function ImagePreviewTrigger({
  src,
  name,
  className,
  children,
  label,
}: {
  src: string | null | undefined;
  /** Shown in the overlay header and used as the download filename. */
  name: string;
  className?: string;
  children?: ReactNode;
  label?: string;
}) {
  const t = useTranslations('common.filePreview');
  const [open, setOpen] = useState(false);

  if (!src) return null;

  return (
    <>
      <TriggerButton onOpen={() => setOpen(true)} label={label ?? t('preview')} className={className}>
        {children ?? <Eye className="h-4 w-4" aria-hidden="true" />}
      </TriggerButton>
      {open && (
        <PreviewOverlay source={{ url: src, name, kind: 'image' }} onClose={() => setOpen(false)} />
      )}
    </>
  );
}
