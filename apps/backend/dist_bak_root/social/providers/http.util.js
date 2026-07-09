"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.fetchJson = fetchJson;
async function fetchJson(url, headers = {}, timeoutMs = 8000) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
        const res = await fetch(url, { headers, signal: controller.signal });
        if (!res.ok) {
            const body = await res.text().catch(() => '');
            throw new Error(`HTTP ${res.status} ${res.statusText} — ${body.slice(0, 300)}`);
        }
        return (await res.json());
    }
    finally {
        clearTimeout(timer);
    }
}
//# sourceMappingURL=http.util.js.map