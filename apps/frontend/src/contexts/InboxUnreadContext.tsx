'use client';

import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Permission } from '@/lib/permissions';
import { inboxApi } from '@/lib/contactApi';

interface InboxUnreadValue {
  /** Number of unread contact messages. */
  unread: number;
  /** Re-fetch the count from the server. */
  refresh: () => void;
  /** Push an exact value (e.g. right after the inbox page reloads its counts). */
  setUnread: (n: number) => void;
}

const InboxUnreadContext = createContext<InboxUnreadValue>({
  unread: 0,
  refresh: () => {},
  setUnread: () => {},
});

export function InboxUnreadProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { hasPermission } = useAuth();
  const [unread, setUnread] = useState(0);

  const canSee = hasPermission(Permission.CONTACT_MESSAGES_VIEW);

  const refresh = useCallback(() => {
    if (!canSee) return;
    inboxApi
      .counts()
      .then((c) => setUnread(c.unread))
      .catch(() => {});
  }, [canSee]);

  // Initial fetch + poll, and refresh on navigation so the badge stays current.
  useEffect(() => {
    if (!canSee) return;
    refresh();
    const id = setInterval(refresh, 60_000);
    return () => clearInterval(id);
  }, [canSee, pathname, refresh]);

  return (
    <InboxUnreadContext.Provider value={{ unread, refresh, setUnread }}>
      {children}
    </InboxUnreadContext.Provider>
  );
}

export const useInboxUnread = () => useContext(InboxUnreadContext);
