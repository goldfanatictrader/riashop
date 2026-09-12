import { useEffect, useRef } from "react";
import * as pdfjsLib from "pdfjs-dist";

export function ProbePdf({ url }: { url: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const status = document.createElement("p");
    // t: the resolved type of container
    const check: HTMLDivElement = container;
    void status;
    void check;
    void url;
    void pdfjsLib;
  }, [url]);
  return <div ref={containerRef} />;
}