'use client';

import { useEffect, useRef, useState } from 'react';
import type { PDFDocumentProxy, PDFDocumentLoadingTask } from 'pdfjs-dist';
import type { PageFlip } from 'page-flip';
// pdf.js's own text-layer stylesheet. Hand-copying it was tempting (we use ~3KB of
// its 163KB) but the rules depend on internals — --total-scale-factor, the
// .markedContent contract, per-span transforms — that move between majors. Import
// the real thing so a pdfjs upgrade brings its CSS with it. It only reaches routes
// that import this component, and it scopes to .textLayer; the four :root blocks it
// carries define pdfjs-namespaced variables only.
import 'pdfjs-dist/web/pdf_viewer.css';

/**
 * The Library's flipbook reader: pdf.js paints each page to a <canvas>, page-flip
 * turns them.
 *
 * MEMORY IS THE WHOLE DESIGN. The library holds a 218-page book; rendering every
 * page up front at 2x DPR is roughly a gigabyte of bitmap and kills the tab. So
 * only a window of pages around the reader is ever rendered, and canvases outside
 * it are actively freed by zeroing their dimensions — dropping the element is not
 * enough, the backing bitmap is what costs. Peak stays near WINDOW*2 pages.
 *
 * A text layer is rendered over every canvas. That is what keeps Ctrl+F, text
 * selection, copy, and screen-reader access working — the things the native PDF
 * viewer gave us for free and a canvas flipbook would otherwise throw away. It is
 * not a nice-to-have for a library whose entire purpose is reading.
 *
 * `src` is always a same-origin blob: URL — see BookPreviewOverlay for why the
 * bytes cannot be handed to a viewer as a plain backend URL.
 */
const WINDOW = 2; // pages rendered ahead/behind the current spread
const RELEASE_BEYOND = 4; // free canvases further away than this

export function BookFlipReader({
  src,
  onReady,
  onFail,
}: {
  src: string;
  onReady?: () => void;
  onFail?: () => void;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  // Measured for sizing instead of the host: page-flip owns the host and it
  // starts empty, so its own box is 0x0 until the book is built — measuring it
  // would compute a negative scale and render nothing.
  const stageRef = useRef<HTMLDivElement>(null);
  const [pageLabel, setPageLabel] = useState('');

  // Callbacks routed through refs: they are recreated on every parent render, and
  // a changing dep here would tear down and rebuild the whole book.
  const onReadyRef = useRef(onReady);
  const onFailRef = useRef(onFail);
  useEffect(() => { onReadyRef.current = onReady; onFailRef.current = onFail; });

  useEffect(() => {
    const host = hostRef.current;
    const stage = stageRef.current;
    if (!host || !stage || !src) return;

    let cancelled = false;
    let flip: PageFlip | null = null;
    let doc: PDFDocumentProxy | null = null;
    // The loading task, NOT the document, owns destroy() in pdf.js v6 — the proxy
    // has no teardown of its own. Holding only the doc would leak the worker.
    let task: PDFDocumentLoadingTask | null = null;
    const rendered = new Map<number, HTMLCanvasElement>();

    (async () => {
      try {
        const pdfjs = await import('pdfjs-dist');
        // Bundled worker — no CDN, and no second copy of pdf.js.
        pdfjs.GlobalWorkerOptions.workerSrc = new URL(
          'pdfjs-dist/build/pdf.worker.min.mjs',
          import.meta.url,
        ).toString();
        const { PageFlip: PF } = await import('page-flip');

        task = pdfjs.getDocument({ url: src });
        doc = await task.promise;
        if (cancelled || !doc) return;

        // Size the book from page 1. A phone cannot hold a two-page spread, so
        // below the spread threshold we size for ONE page filling the stage —
        // dividing by two there would render a book at half a phone's width.
        // page-flip then picks portrait on its own, because the stage is narrower
        // than two pages (that is what `usePortrait` allows).
        const first = await doc.getPage(1);
        const base = first.getViewport({ scale: 1 });
        const box = stage.getBoundingClientRect();
        const spread = box.width >= 640; // Tailwind's sm — matches the overlay's own breakpoint
        const gutter = spread ? 40 : 16;
        const availW = spread ? (box.width - gutter) / 2 : box.width - gutter;
        const scale = Math.min(availW / base.width, (box.height - gutter) / base.height);
        const pw = Math.floor(base.width * scale);
        const ph = Math.floor(base.height * scale);

        // Every page gets an element immediately — page-flip needs the full count
        // to paginate — but only a window of them ever holds pixels.
        const pageEls: HTMLElement[] = [];
        for (let i = 0; i < doc.numPages; i++) {
          const el = document.createElement('div');
          el.className = 'flip-page';
          const inner = document.createElement('div');
          inner.className = 'flip-page__inner';
          const canvas = document.createElement('canvas');
          // A fresh canvas is 300x150 and allocates its bitmap immediately — for a
          // 218-page book that is ~39MB of pages nobody has looked at. Start every
          // page at zero; ensure() gives it real dimensions when it is rendered.
          canvas.width = 0;
          canvas.height = 0;
          const tl = document.createElement('div');
          tl.className = 'textLayer';
          tl.style.setProperty('--scale-factor', String(scale));
          tl.style.setProperty('--total-scale-factor', String(scale));
          inner.append(canvas, tl);
          el.append(inner);
          host.append(el);
          pageEls.push(el);
        }

        const ensure = async (idx: number) => {
          if (cancelled || !doc) return;
          if (idx < 0 || idx >= doc.numPages || rendered.has(idx)) return;
          const el = pageEls[idx];
          const canvas = el.querySelector('canvas');
          const tl = el.querySelector('.textLayer') as HTMLElement | null;
          if (!canvas || !tl) return;
          rendered.set(idx, canvas); // claim first — ensure() can be re-entered while awaiting
          const page = await doc.getPage(idx + 1);
          if (cancelled) return;
          const viewport = page.getViewport({ scale });
          const dpr = Math.min(window.devicePixelRatio || 1, 2);
          canvas.width = Math.round(viewport.width * dpr);
          canvas.height = Math.round(viewport.height * dpr);
          await page.render({
            canvas,
            viewport,
            transform: dpr !== 1 ? [dpr, 0, 0, dpr, 0, 0] : undefined,
          }).promise;
          canvas.dataset.rendered = '1';
          if (cancelled) return;
          tl.replaceChildren();
          const layer = new pdfjs.TextLayer({
            textContentSource: page.streamTextContent(),
            container: tl,
            viewport,
          });
          await layer.render();
        };

        const release = (current: number) => {
          for (const [i, canvas] of Array.from(rendered.entries())) {
            if (Math.abs(i - current) <= RELEASE_BEYOND) continue;
            // Zeroing the dimensions is what actually frees the bitmap; removing
            // the node alone leaves it to the GC's discretion.
            canvas.width = 0;
            canvas.height = 0;
            delete canvas.dataset.rendered;
            (pageEls[i].querySelector('.textLayer') as HTMLElement | null)?.replaceChildren();
            rendered.delete(i);
          }
        };

        flip = new PF(host, {
          width: pw,
          height: ph,
          size: 'fixed',
          showCover: true,
          usePortrait: true,
          maxShadowOpacity: 0.5,
          mobileScrollSupport: false,
          drawShadow: true,
        });

        flip.loadFromHTML(pageEls);

        const label = (i: number) => setPageLabel(`${Math.min(i + 1, doc!.numPages)} / ${doc!.numPages}`);
        label(0);

        flip.on('flip', (e) => {
          const i = typeof e.data === 'number' ? e.data : 0;
          label(i);
          for (let d = -WINDOW; d <= WINDOW + 1; d++) void ensure(i + d);
          release(i);
        });

        // First spread, then the next one so a forward flip is instant.
        for (let i = 0; i <= WINDOW + 1; i++) await ensure(i);
        if (cancelled) return;
        onReadyRef.current?.();
      } catch {
        if (!cancelled) onFailRef.current?.();
      }
    })();

    return () => {
      cancelled = true;
      try { flip?.destroy(); } catch { /* already gone */ }
      for (const canvas of Array.from(rendered.values())) { canvas.width = 0; canvas.height = 0; }
      rendered.clear();
      void task?.destroy();
      host.replaceChildren();
    };
  }, [src]);

  return (
    // The wrapper centres; the host is page-flip's and gets no layout of ours.
    <div ref={stageRef} className="relative flex h-full w-full items-center justify-center overflow-hidden">
      <div ref={hostRef} className="flip-book" />
      {pageLabel && (
        <span className="pointer-events-none absolute bottom-2 start-1/2 -translate-x-1/2 rounded-full bg-black/60 px-2.5 py-1 text-[11px] font-medium tabular-nums text-white/80 backdrop-blur-sm rtl:translate-x-1/2">
          {pageLabel}
        </span>
      )}
    </div>
  );
}
