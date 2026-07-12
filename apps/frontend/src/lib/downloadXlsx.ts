import { apiClient } from './api';

/**
 * Download an admin .xlsx report.
 *
 * The reports are built by the backend and served from authenticated routes, so
 * they come back as bytes on the shared (token-bearing) client rather than JSON,
 * and are handed to the browser as an object URL.
 *
 * Empty/blank params are dropped so a cleared filter doesn't narrow the report.
 */
export async function downloadXlsx(
  path: string,
  params: Record<string, string | undefined>,
  baseName: string,
): Promise<void> {
  const query: Record<string, string> = {};
  for (const [key, value] of Object.entries(params)) {
    if (value?.trim()) query[key] = value.trim();
  }

  const { data } = await apiClient.get(path, { params: query, responseType: 'blob' });

  const url = URL.createObjectURL(data as Blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${baseName}-${new Date().toISOString().slice(0, 10)}.xlsx`;
  link.click();
  URL.revokeObjectURL(url);
}
