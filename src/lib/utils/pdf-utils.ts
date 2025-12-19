import { PDFDocumentProxy } from 'pdfjs-dist';

// Define types locally to avoid dependency issues
export interface PDFPage {
  pageNumber: number;
  text: string;
}

export interface PDFExtractionResult {
  fullText: string;
  pages: PDFPage[];
  pageCount: number;
  isScanned: boolean;
}

export const extractDataFromPDF = async (file: File): Promise<PDFExtractionResult> => {
  try {
    // 1. Dynamic Import (Safe for Next.js)
    // @ts-ignore
    const pdfjsLib = await import('pdfjs-dist/build/pdf.min.mjs');

    // 2. Set Worker
    if (typeof window !== 'undefined' && !pdfjsLib.GlobalWorkerOptions.workerSrc) {
       pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';
    }

    const arrayBuffer = await file.arrayBuffer();
    const loadingTask = pdfjsLib.getDocument({ 
      data: arrayBuffer,
      disableFontFace: false 
    });

    const pdf = await loadingTask.promise as unknown as PDFDocumentProxy;
    
    let fullHtml = "";
    const pages: PDFPage[] = [];
    const maxPages = Math.min(pdf.numPages, 50); 
    
    for (let i = 1; i <= maxPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      
      // 1. Sort items by Y (Top->Bottom), then X (Left->Right)
      const items = (textContent.items as any[]).map(item => ({
          str: item.str,
          x: item.transform[4], // X Position
          y: item.transform[5], // Y Position
          w: item.width,        // Width of this specific text chunk
          h: item.height || 0
      }));

      // Sort with a small vertical tolerance (aligned lines)
      items.sort((a, b) => {
          const yDiff = Math.abs(a.y - b.y);
          if (yDiff > 4) { // If >4px vertical difference, it's a new line
              return b.y - a.y; // Top down (PDF Y is inverted usually)
          }
          return a.x - b.x; // Left to Right
      });

      // 2. Reconstruct Text with Geometry Math
      let pageHtml = "";
      let currentParagraph = "";
      let lastY = -999;
      let lastXEnd = -999; // Where the previous letter ended

      for (const item of items) {
          if (item.str.trim().length === 0) continue; // Skip empty spacing items

          // CHECK NEW LINE: If Y changes significantly
          if (lastY !== -999 && Math.abs(item.y - lastY) > 10) {
             if (currentParagraph) {
                 pageHtml += `<p>${currentParagraph.trim()}</p>`;
                 currentParagraph = "";
             }
             lastXEnd = -999; // Reset horizontal tracking on new line
          }

          // CHECK SPACING: Calculate gap between Previous End and Current Start
          let prefix = "";
          if (lastXEnd !== -999) {
              const gap = item.x - lastXEnd;
              
              // Logic:
              // - Gap < 3px: Likely kerning (part of same word) -> No space
              // - Gap > 3px: Likely separate words -> Add space
              // - Fullstop fix: Even if gap is small, if prev was '.' and this is capital, maybe space? 
              //   (But usually geometry holds true. We trust the gap > 2 rule).
              if (gap > 3.5) { // 3.5px is a safe average threshold for 10-12pt font
                  prefix = " "; 
              }
          }

          currentParagraph += prefix + item.str;
          
          lastY = item.y;
          lastXEnd = item.x + item.w; // Update end position
      }
      
      // Flush last paragraph
      if (currentParagraph) {
          pageHtml += `<p>${currentParagraph.trim()}</p>`;
      }

      if (pageHtml.length > 0) {
        pages.push({ pageNumber: i, text: pageHtml });
        fullHtml += `<p><strong>--- Page ${i} ---</strong></p>${pageHtml}`;
      }
    }

    const isScanned = pdf.numPages > 0 && (fullHtml.length / pdf.numPages) < 50;

    return {
      fullText: fullHtml,
      pages,
      pageCount: pdf.numPages,
      isScanned
    };

  } catch (e: any) { 
      console.error("PDF Extraction Error:", e);
      return { fullText: "", pages: [], pageCount: 0, isScanned: false }; 
  }
};