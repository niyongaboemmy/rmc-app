'use client';

/**
 * Chooses what the gallery body renders: the normal public view, or — for a
 * super-admin in Edit Mode — the in-context editable board (tabs, add tiles,
 * per-photo controls). The public `read` view is passed in from the server
 * component so it stays server-rendered and unchanged for everyone else.
 */

import React from 'react';
import { useEditMode } from '@/lib/edit-mode/EditModeProvider';
import { GalleryEditBoard } from './GalleryEditBoard';

export function GallerySwitch({ read }: { read: React.ReactNode }) {
  const { canEdit, editMode } = useEditMode();
  if (canEdit && editMode) return <GalleryEditBoard />;
  return <>{read}</>;
}
