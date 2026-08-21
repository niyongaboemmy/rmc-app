'use client';

/**
 * Chooses what the About page body renders: the normal server-rendered public
 * view, or — for a super-admin in Edit Mode — the in-context editable board
 * (`AboutEditBoard`). The public `read` view is passed in from the server
 * component so it stays server-rendered and unchanged for everyone else.
 */

import React from 'react';
import { useEditMode } from '@/lib/edit-mode/EditModeProvider';
import { AboutEditBoard } from './AboutEditBoard';

export function AboutSwitch({
  initial,
  read,
}: {
  initial: Record<string, unknown> | null;
  read: React.ReactNode;
}) {
  const { canEdit, editMode } = useEditMode();
  if (canEdit && editMode) return <AboutEditBoard initial={initial} />;
  return <>{read}</>;
}
