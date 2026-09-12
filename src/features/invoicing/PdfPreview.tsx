import { useEffect, useRef, useState } from "react";
import * as pdfjsLib from "pdfjs-dist";
import pdfWorkerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

export function PdfPreview({ blob, title }: { blob: Blob; title: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let disposed = false;
    let task: pdfjsLib.PDFDocumentLoadingTask | null = null;
    async function render() {
      const container = containerRef.current;
      if (!container) return;
      container.textContent = "";
      const status = document.createElement("p");
      status.className = "notice";
      status.setAttribute("role", "status");
      status.textContent = "Menyiapkan pratinjau…";
      container.appendChild(status);
      setError("");
      try {
        const data = new Uint8Array(await blob.arrayBuffer());
        task = pdfjsLib.getDocument({ data });
        const pdf = await task.promise;
        if (disposed) return;
        container.textContent = "";
        for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
          if (disposed) return;
          const page = await pdf.getPage(pageNumber);
          const viewport = page.getViewport({ scale: 1.66 });
          const canvas = document.createElement("canvas");
          canvas.title = `Halaman ${pageNumber} dari ${pdf.numPages}`;
          canvas.width = Math.floor(viewport.width);
          canvas.height = Math.floor(viewport.height);
          const renderTask = page.render({ canvas, viewport });
          await renderTask.promise;
          if (disposed) return;
          container.appendChild(canvas);
        }
      } catch (caught) {
        if (disposed) return;
        console.error("Pratinjau PDF gagal dirender.", caught);
        container.textContent = "";
        const reason = caught instanceof Error ? caught.message : String(caught);
        setError(`Pratinjau PDF gagal dibuka (${reason}). Gunakan Bagikan PDF, atau unduh dan buka filenya.`);
      }
    }
    void render();
    return () => { disposed = true; void task?.destroy(); };
  }, [blob]);

  return (
    <div className="pdf-preview-body">
      {error && <p className="notice" role="alert">{error}</p>}
      <div ref={containerRef} className="pdf-preview-canvas" aria-label={`Pratinjau ${title}`} />
    </div>
  );
}
