'use client';
import { useState } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { Loader2, ZoomIn, ZoomOut } from 'lucide-react';

// Setup worker (Crucial for Next.js)
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface PDFViewerProps {
  url: string;
  focusedRange?: { start: number; end: number }; 
}

export function PDFViewer({ url, focusedRange }: PDFViewerProps) {
  const [numPages, setNumPages] = useState<number>(0);
  const [scale, setScale] = useState(1.0);

  function onDocumentLoadSuccess({ numPages }: { numPages: number }) {
    setNumPages(numPages);
  }

  // 🧠 THE LOGIC: Calculate which pages to show
  const pagesToRender = () => {
    if (!focusedRange || focusedRange.start === 0) {
      // Show ALL pages if no range is set
      return Array.from(new Array(numPages), (el, index) => index + 1);
    }

    // Calculate Buffer (1 page before, 1 page after)
    const start = Math.max(1, focusedRange.start - 1);
    const end = Math.min(numPages, focusedRange.end + 1);

    const pages = [];
    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    return pages;
  };

  return (
    <div className="flex flex-col h-full bg-slate-50">
      {/* Toolbar */}
      <div className="flex items-center justify-between p-2 bg-white border-b shadow-sm z-10 sticky top-0">
        <div className="text-xs font-bold text-slate-500">
          {focusedRange 
            ? `Focused View: Pgs ${Math.max(1, focusedRange.start - 1)} - ${focusedRange.end + 1}` 
            : `Full Document (${numPages} Pages)`}
        </div>
        <div className="flex gap-2">
          <button onClick={() => setScale(s => Math.max(0.5, s - 0.1))} className="p-1 hover:bg-slate-100 rounded"><ZoomOut className="w-4 h-4"/></button>
          <span className="text-xs font-mono self-center">{Math.round(scale * 100)}%</span>
          <button onClick={() => setScale(s => Math.min(2.0, s + 0.1))} className="p-1 hover:bg-slate-100 rounded"><ZoomIn className="w-4 h-4"/></button>
        </div>
      </div>

      {/* Scrollable Document Area */}
      <div className="flex-1 overflow-y-auto p-4 flex justify-center">
        <Document
          file={url}
          onLoadSuccess={onDocumentLoadSuccess}
          loading={<div className="flex items-center gap-2 mt-10 text-slate-500"><Loader2 className="animate-spin text-indigo-600"/> Loading PDF...</div>}
          className="shadow-xl"
        >
          {pagesToRender().map((pageNumber) => (
            <div key={pageNumber} className="mb-4 relative">
              {/* Page Number Badge */}
              <span className="absolute top-2 -right-10 text-xs font-bold text-slate-400 w-8 text-center">
                {pageNumber}
              </span>
              
              <Page 
                pageNumber={pageNumber} 
                scale={scale} 
                renderAnnotationLayer={false}
                renderTextLayer={false} 
                className="border border-slate-200"
              />
            </div>
          ))}
        </Document>
      </div>
    </div>
  );
}