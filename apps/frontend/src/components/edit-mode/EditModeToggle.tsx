'use client';

/**
 * Navbar switch that turns in-context Edit Mode on/off. Renders nothing unless
 * the signed-in user is a super-admin, so it is invisible to everyone else.
 *
 * `variant="mobile"` renders a full-width row for the slide-out mobile menu.
 */

import { useEditMode } from '@/lib/edit-mode/EditModeProvider';
import { useToast } from '@/components/ui/Toast';
import { Pencil } from 'lucide-react';

export function EditModeToggle({
  variant = 'desktop',
  onToggle,
}: {
  variant?: 'desktop' | 'mobile';
  onToggle?: () => void;
}) {
  const { canEdit, editMode, toggleEditMode } = useEditMode();
  const toast = useToast();
  if (!canEdit) return null;

  const handleClick = () => {
    // `editMode` is this render's value, so !editMode is the state we're entering.
    if (!editMode) {
      toast.success('Edit mode on — click any text, image, or link to edit. Publish when you’re done.');
    }
    toggleEditMode();
    onToggle?.();
  };

  if (variant === 'mobile') {
    return (
      <button
        onClick={handleClick}
        aria-pressed={editMode}
        className={`flex items-center gap-3 w-full px-4 py-3 rounded-2xl text-sm font-medium transition-colors ${
          editMode
            ? 'bg-rmc-gold/20 text-rmc-gold-light'
            : 'text-white/85 hover:bg-white/10 hover:text-white'
        }`}
      >
        <Pencil className="w-4 h-4 text-rmc-gold" />
        {editMode ? 'Editing — tap to exit' : 'Edit this page'}
      </button>
    );
  }

  return (
    <button
      onClick={handleClick}
      aria-pressed={editMode}
      title={editMode ? 'Exit edit mode' : 'Edit this page in place'}
      className={`inline-flex items-center gap-1.5 text-[13px] font-medium px-3 py-1.5 rounded-full border transition-all duration-200 ${
        editMode
          ? 'border-rmc-gold/60 bg-rmc-gold/20 text-rmc-gold-light'
          : 'border-white/25 bg-white/10 text-white/80 hover:bg-white/20 hover:border-white/50 hover:text-white'
      }`}
    >
      <Pencil className="w-3.5 h-3.5" />
      {editMode ? 'Editing' : 'Edit'}
    </button>
  );
}
