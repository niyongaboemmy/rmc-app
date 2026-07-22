'use client';

/**
 * Floating action bar for in-context Edit Mode.
 *
 * Rendered once, globally (see the locale layout). It is invisible until a
 * super-admin turns Edit Mode on, then it pins to the bottom of the viewport and
 * exposes the batch actions: Publish (persist every edited section), Discard
 * (revert), and Done (leave Edit Mode). Unsaved edits are surfaced as a count.
 */

import { useEditMode } from '@/lib/edit-mode/EditModeProvider';
import { useToast } from '@/components/ui/Toast';
import { Check, Loader2, RotateCcw, Pencil, X } from 'lucide-react';

export function EditModeBar() {
  const { canEdit, editMode, dirtyKeys, saving, saveAll, discardAll, setEditMode } = useEditMode();
  const toast = useToast();

  if (!canEdit || !editMode) return null;

  const dirtyCount = dirtyKeys.length;
  const hasChanges = dirtyCount > 0;

  const handlePublish = async () => {
    const ok = await saveAll();
    if (ok) toast.success(dirtyCount === 1 ? 'Section published' : `${dirtyCount} sections published`);
    else toast.error('Some sections could not be published');
  };

  return (
    <div className="fixed inset-x-0 bottom-4 z-[60] flex justify-center px-4 pointer-events-none">
      <div className="pointer-events-auto flex items-center gap-2 rounded-full border border-white/10 bg-gray-900/95 backdrop-blur-xl px-2.5 py-2 shadow-2xl shadow-black/40">
        <span className="flex items-center gap-2 pl-2 pr-1 text-sm font-semibold text-white">
          <Pencil className="w-3.5 h-3.5 text-rmc-gold" />
          Edit mode
        </span>

        <span
          className={`text-xs px-2 py-0.5 rounded-full font-medium ${
            hasChanges ? 'bg-rmc-gold/20 text-rmc-gold-light' : 'bg-white/10 text-white/50'
          }`}
        >
          {hasChanges ? `${dirtyCount} unsaved` : 'No changes'}
        </span>

        <div className="w-px h-6 bg-white/10 mx-0.5" />

        <button
          onClick={discardAll}
          disabled={!hasChanges || saving}
          className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium text-white/80 hover:bg-white/10 hover:text-white transition-colors disabled:opacity-40 disabled:pointer-events-none"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          Discard
        </button>

        <button
          onClick={handlePublish}
          disabled={!hasChanges || saving}
          className="flex items-center gap-1.5 rounded-full bg-rmc-green px-4 py-1.5 text-sm font-semibold text-white shadow-lg shadow-rmc-green/30 hover:bg-rmc-green-dark transition-colors disabled:opacity-40 disabled:pointer-events-none"
        >
          {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
          {saving ? 'Publishing…' : 'Publish'}
        </button>

        <button
          onClick={() => setEditMode(false)}
          title="Leave edit mode"
          aria-label="Leave edit mode"
          className="flex items-center justify-center w-8 h-8 rounded-full text-white/60 hover:bg-white/10 hover:text-white transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
