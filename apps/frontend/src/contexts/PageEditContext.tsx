'use client';

import { createContext, useContext } from 'react';

export type EditLang = 'en' | 'rw' | 'ar';

/**
 * A small controller a page can expose so shared chrome (e.g. the Navbar) can
 * offer an inline "Edit" action for that page. It is OPTIONAL: `usePageEdit()`
 * returns null on any page that doesn't provide it, so the Navbar renders the
 * Edit button only where inline editing is available and the user may edit.
 */
export interface PageEditController {
  canEdit: boolean;
  editing: boolean;
  saving: boolean;
  dirty: boolean;
  lang: EditLang;
  setLang: (l: EditLang) => void;
  startEdit: () => void;
  cancel: () => void;
  save: () => void;
}

export const PageEditContext = createContext<PageEditController | null>(null);

export function usePageEdit(): PageEditController | null {
  return useContext(PageEditContext);
}
