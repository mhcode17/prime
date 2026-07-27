"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import * as pdfjsLib from "pdfjs-dist";

// Point pdf.js at its worker (bundled by Next as an asset URL).
if (typeof window !== "undefined" && !pdfjsLib.GlobalWorkerOptions.workerSrc) {
  pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
    "pdfjs-dist/build/pdf.worker.min.mjs",
    import.meta.url,
  ).toString();
}

export interface PageSize {
  w: number; // CSS px
  h: number;
}

interface RenderItem {
  page: pdfjsLib.PDFPageProxy;
  vp: pdfjsLib.PageViewport;
}

function dataUrlToUint8(dataUrl: string): Uint8Array {
  const base64 = dataUrl.includes(",") ? dataUrl.split(",")[1] : dataUrl;
  const bin = atob(base64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

export function PdfCanvas({
  dataUrl,
  maxWidth = 820,
  renderPageOverlay,
  onReady,
}: {
  dataUrl: string;
  maxWidth?: number;
  renderPageOverlay?: (pageIndex: number, size: PageSize) => React.ReactNode;
  onReady?: (pages: PageSize[]) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRefs = useRef<(HTMLCanvasElement | null)[]>([]);
  const renderItems = useRef<RenderItem[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const renderTasks = useRef<any[]>([]);
  const [pages, setPages] = useState<PageSize[]>([]);
  const [width, setWidth] = useState(maxWidth);
  const [error, setError] = useState<string | null>(null);

  // Measure available width (fit-to-container, capped at maxWidth).
  useLayoutEffect(() => {
    const measure = () => {
      const w = containerRef.current?.clientWidth ?? maxWidth;
      setWidth(Math.min(maxWidth, w || maxWidth));
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [maxWidth]);

  // 1) Load the document + compute page viewports.
  useEffect(() => {
    let cancelled = false;
    let doc: pdfjsLib.PDFDocumentProxy | null = null;

    (async () => {
      try {
        const data = dataUrlToUint8(dataUrl);
        doc = await pdfjsLib.getDocument({ data }).promise;
        if (cancelled) return;

        const sizes: PageSize[] = [];
        const items: RenderItem[] = [];
        for (let i = 1; i <= doc.numPages; i++) {
          const page = await doc.getPage(i);
          const base = page.getViewport({ scale: 1 });
          const scale = width / base.width;
          const vp = page.getViewport({ scale });
          sizes.push({ w: vp.width, h: vp.height });
          items.push({ page, vp });
        }
        if (cancelled) return;
        renderItems.current = items;
        canvasRefs.current = new Array(items.length).fill(null);
        renderTasks.current = new Array(items.length).fill(null);
        setError(null);
        setPages(sizes);
        onReady?.(sizes);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to render PDF");
      }
    })();

    return () => {
      cancelled = true;
      renderTasks.current.forEach((t) => t?.cancel?.());
      doc?.destroy();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dataUrl, width]);

  // 2) Paint each page — runs AFTER the DOM commits, so canvas refs exist.
  useEffect(() => {
    let cancelled = false;
    const dpr = window.devicePixelRatio || 1;

    (async () => {
      for (let i = 0; i < renderItems.current.length; i++) {
        if (cancelled) return;
        const canvas = canvasRefs.current[i];
        const item = renderItems.current[i];
        if (!canvas || !item) continue;

        renderTasks.current[i]?.cancel?.();
        canvas.width = Math.floor(item.vp.width * dpr);
        canvas.height = Math.floor(item.vp.height * dpr);
        const ctx = canvas.getContext("2d");
        if (!ctx) continue;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

        try {
          const task = item.page.render({ canvasContext: ctx, viewport: item.vp });
          renderTasks.current[i] = task;
          await task.promise;
        } catch {
          // RenderingCancelledException etc. — ignore.
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [pages]);

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
        Could not render PDF: {error}
      </div>
    );
  }

  return (
    <div ref={containerRef} className="flex w-full flex-col items-center gap-4">
      {pages.map((size, i) => (
        <div
          key={i}
          className="relative bg-white shadow-sm ring-1 ring-slate-200"
          style={{ width: size.w, height: size.h }}
        >
          <canvas
            ref={(el) => {
              canvasRefs.current[i] = el;
            }}
            style={{ width: size.w, height: size.h }}
            className="block"
          />
          {renderPageOverlay && (
            <div className="absolute inset-0">{renderPageOverlay(i, size)}</div>
          )}
        </div>
      ))}
      {pages.length === 0 && !error && (
        <div className="py-16 text-sm text-slate-400">Loading document…</div>
      )}
    </div>
  );
}
