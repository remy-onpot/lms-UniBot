import { PDFDocumentProxy } from 'pdfjs-dist';

export interface PDFPage {
  pageNumber: number;
  text: string;
}

export interface PDFExtractionResult {
  fullText: string;
  pages: PDFPage[];
  pageCount: number;
  isScanned: boolean; // <--- NEW: Flag to detect bad PDFs
}

export const extractDataFromPDF = async (file: File): Promise<PDFExtractionResult> => {
  try {
    const pdfjsLib = await import('pdfjs-dist');

    // Robust Worker Path for Next.js (Local & Production)
    if (typeof window !== 'undefined') {
      pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs'; 
    }

    const arrayBuffer = await file.arrayBuffer();
    // Fix: Cast to unknown first to avoid TS errors with pdfjs-dist versions
    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
    const pdf = await loadingTask.promise as unknown as PDFDocumentProxy;
    
    let fullText = "";
    const pages: PDFPage[] = [];
    const maxPages = Math.min(pdf.numPages, 50); 
    
    for (let i = 1; i <= maxPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      
      const rawText = textContent.items
        .map((item: any) => item.str)
        .join(' ');
      
      const cleanText = rawText.replace(/\s+/g, ' ').trim();

      // Only add pages that actually have content
      if (cleanText.length > 0) {
        pages.push({ pageNumber: i, text: cleanText });
        fullText += `\n--- Page ${i} ---\n${cleanText}`;
      }
    }

    // SCANNED PDF DETECTION LOGIC
    // If we have pages but almost no text (less than 50 chars per page avg), it's likely an image scan.
    const isScanned = pdf.numPages > 0 && (fullText.length / pdf.numPages) < 50;

    return {
      fullText,
      pages,
      pageCount: pdf.numPages,
      isScanned
    };

  } catch (e: any) { 
      console.error("PDF Extraction Error:", e);
      return { fullText: "", pages: [], pageCount: 0, isScanned: false }; 
  }
};