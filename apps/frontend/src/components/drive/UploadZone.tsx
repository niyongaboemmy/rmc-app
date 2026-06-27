'use client';

import {
  useState, useRef, useCallback, forwardRef, useImperativeHandle,
} from 'react';
import { Upload, X, CheckCircle2, AlertCircle, FileText } from 'lucide-react';
import { uploadMedia } from '@/lib/mediaUpload';
import { addFile } from '@/lib/driveApi';

export interface UploadZoneHandle {
  /** Open the OS file picker */
  trigger: () => void;
}

interface UploadItem {
  id: string;
  file: File;
  progress: number;
  status: 'pending' | 'uploading' | 'done' | 'error';
  error?: string;
}

interface UploadZoneProps {
  parentId?: string;
  onUploaded: () => void;
  children?: React.ReactNode;
  /** When true the zone fills its parent and shows a visible border when idle */
  fullArea?: boolean;
}

export const UploadZone = forwardRef<UploadZoneHandle, UploadZoneProps>(
  function UploadZone({ parentId, onUploaded, children, fullArea = false }, ref) {
    const [dragging, setDragging] = useState(false);
    const [uploads, setUploads] = useState<UploadItem[]>([]);
    const [panelVisible, setPanelVisible] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    /* Expose trigger() so parent toolbars can open the file picker */
    useImperativeHandle(ref, () => ({
      trigger: () => inputRef.current?.click(),
    }));

    const processFiles = useCallback(
      async (files: File[]) => {
        if (!files.length) return;
        setPanelVisible(true);
        const newUploads: UploadItem[] = files.map((f) => ({
          id: crypto.randomUUID(),
          file: f,
          progress: 0,
          status: 'pending' as const,
        }));
        setUploads((prev) => [...prev, ...newUploads]);

        for (const item of newUploads) {
          setUploads((prev) =>
            prev.map((u) => (u.id === item.id ? { ...u, status: 'uploading' as const } : u)),
          );
          try {
            const storageKey = await uploadMedia(item.file, 'drive', (pct) => {
              setUploads((prev) =>
                prev.map((u) => (u.id === item.id ? { ...u, progress: pct } : u)),
              );
            });
            await addFile({
              name: item.file.name,
              storageKey,
              mimeType: item.file.type || undefined,
              size: item.file.size,
              parentId,
            });
            setUploads((prev) =>
              prev.map((u) =>
                u.id === item.id ? { ...u, status: 'done' as const, progress: 100 } : u,
              ),
            );
            onUploaded();
          } catch {
            setUploads((prev) =>
              prev.map((u) =>
                u.id === item.id ? { ...u, status: 'error' as const, error: 'Upload failed' } : u,
              ),
            );
          }
        }
      },
      [parentId, onUploaded],
    );

    const onDrop = (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDragging(false);
      processFiles(Array.from(e.dataTransfer.files));
    };

    const onDragOver = (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDragging(true);
    };

    const onDragLeave = (e: React.DragEvent) => {
      /* Only clear when leaving the zone itself, not a child */
      if (!e.currentTarget.contains(e.relatedTarget as Node)) {
        setDragging(false);
      }
    };

    const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files) processFiles(Array.from(e.target.files));
      e.target.value = '';
    };

    const pendingOrUploading = uploads.filter(
      (u) => u.status === 'pending' || u.status === 'uploading',
    ).length;
    const doneCount = uploads.filter((u) => u.status === 'done').length;
    const allSettled = uploads.length > 0 && pendingOrUploading === 0;

    const dismiss = () => {
      setUploads([]);
      setPanelVisible(false);
    };

    return (
      <>
        {/* Drop zone wrapper */}
        <div
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
          className={[
            'relative transition-all duration-150',
            fullArea ? 'flex-1 min-h-0' : '',
            dragging
              ? 'ring-2 ring-rmc-green ring-inset bg-rmc-green/5 rounded-xl'
              : '',
          ].join(' ')}
        >
          {children}

          {/* Drag overlay */}
          {dragging && (
            <div className="absolute inset-0 z-50 flex flex-col items-center justify-center pointer-events-none rounded-xl bg-rmc-green/8 border-2 border-dashed border-rmc-green">
              <div className="bg-white rounded-2xl shadow-xl px-8 py-6 flex flex-col items-center gap-3">
                <div className="w-14 h-14 bg-rmc-green/10 rounded-full flex items-center justify-center">
                  <Upload className="w-7 h-7 text-rmc-green" />
                </div>
                <p className="text-rmc-green font-bold text-lg">Drop files to upload</p>
                <p className="text-gray-400 text-sm">Files will be added to the current folder</p>
              </div>
            </div>
          )}
        </div>

        {/* Hidden file input */}
        <input
          ref={inputRef}
          type="file"
          multiple
          className="hidden"
          onChange={onInputChange}
        />

        {/* Upload progress panel — fixed bottom-right */}
        {panelVisible && uploads.length > 0 && (
          <div className="fixed bottom-5 right-5 z-[9990] w-[340px] bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden">
            {/* Panel header */}
            <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-100">
              <div className="flex items-center gap-2">
                {pendingOrUploading > 0 ? (
                  <div className="w-4 h-4 border-2 border-rmc-green border-t-transparent rounded-full animate-spin" />
                ) : (
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                )}
                <p className="text-sm font-semibold text-gray-800">
                  {pendingOrUploading > 0
                    ? `Uploading ${pendingOrUploading} file${pendingOrUploading > 1 ? 's' : ''}…`
                    : `${doneCount} upload${doneCount > 1 ? 's' : ''} complete`}
                </p>
              </div>
              {allSettled && (
                <button
                  onClick={dismiss}
                  className="p-1 rounded hover:bg-gray-200 transition-colors"
                >
                  <X className="w-3.5 h-3.5 text-gray-500" />
                </button>
              )}
            </div>

            {/* File list */}
            <div className="max-h-64 overflow-y-auto divide-y divide-gray-50">
              {uploads.map((item) => (
                <div key={item.id} className="px-4 py-3">
                  <div className="flex items-center gap-2.5 mb-1.5">
                    <FileText className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                    <p className="text-xs text-gray-700 truncate flex-1 font-medium">
                      {item.file.name}
                    </p>
                    <span className="text-[10px] text-gray-400 shrink-0 font-mono">
                      {item.status === 'done'
                        ? '✓'
                        : item.status === 'error'
                        ? '✗'
                        : `${item.progress}%`}
                    </span>
                  </div>
                  <div className="h-1 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${
                        item.status === 'error'
                          ? 'bg-red-400'
                          : item.status === 'done'
                          ? 'bg-green-400'
                          : 'bg-rmc-green'
                      }`}
                      style={{ width: `${item.progress}%` }}
                    />
                  </div>
                  {item.error && (
                    <p className="text-[10px] text-red-500 mt-1 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" /> {item.error}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </>
    );
  },
);
