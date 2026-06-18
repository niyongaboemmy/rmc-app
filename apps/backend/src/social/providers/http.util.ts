/**
 * Tiny JSON fetch helper with a hard timeout, shared by every social provider.
 *
 * Uses the global `fetch` (Node 18+). Throws a concise error on a non-2xx
 * response or timeout so the calling provider can be skipped without taking
 * down the rest of the feed refresh.
 */
export async function fetchJson<T>(
  url: string,
  headers: Record<string, string> = {},
  timeoutMs = 8000,
): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { headers, signal: controller.signal });
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      throw new Error(`HTTP ${res.status} ${res.statusText} — ${body.slice(0, 300)}`);
    }
    return (await res.json()) as T;
  } finally {
    clearTimeout(timer);
  }
}
