// src/lib/utils/pdf-utils.ts

export interface PDFPage {
  pageNumber: number;
  text: string;
}

export interface PDFExtractionResult {
  fullText: string;
  pages: PDFPage[];
  pageCount: number;
}

export const extractDataFromPDF = async (file: File): Promise<PDFExtractionResult> => {
  try {
    // 1. Dynamic Import (Prevents SSR crashes)
    const pdfjsLib = await import('pdfjs-dist');

    // 2. Worker Configuration
    // We point to the file we just copied to /public
    // Using window.location.origin ensures it works on localhost AND production
    if (typeof window !== 'undefined') {
      pdfjsLib.GlobalWorkerOptions.workerSrc = `${window.location.origin}/pdf.worker.min.mjs`;
    }

    // 3. Load Document
    const arrayBuffer = await file.arrayBuffer();
    // @ts-ignore - mismatch in type definitions often happens with pdfjs-dist
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    
    let fullText = "";
    const pages: PDFPage[] = [];
    
    // Limit to 50 pages for performance/cost safety
    const maxPages = Math.min(pdf.numPages, 50); 
    
    for (let i = 1; i <= maxPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      
      // Extract and clean text
      const rawText = textContent.items
        // @ts-ignore
        .map((item: any) => item.str)
        .join(' ');
      
      const cleanText = rawText.replace(/\s+/g, ' ').trim();

      if (cleanText.length > 0) {
        pages.push({
          pageNumber: i,
          text: cleanText
        });
        fullText += `\n--- Page ${i} ---\n${cleanText}`;
      }
    }

    return {
      fullText,
      pages,
      pageCount: pdf.numPages
    };

  } catch (e: any) { 
      console.error("PDF Extraction Error:", e);
      // Return safer empty object instead of crashing UI
      return { fullText: "", pages: [], pageCount: 0 }; 
  }
};

/**
 * Legacy wrapper for backward compatibility
 */
export const extractTextFromPDF = async (file: File): Promise<string> => {
  const result = await extractDataFromPDF(file);
  return result.fullText;
};