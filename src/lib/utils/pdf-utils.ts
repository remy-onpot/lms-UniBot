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
    // Dynamic import prevents server-side rendering crashes
    const pdfjsLib = await import('pdfjs-dist');
    
    // Ensure the worker is correctly loaded from your public folder
    pdfjsLib.GlobalWorkerOptions.workerSrc = `/pdf.worker.min.mjs`;

    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    
    let fullText = "";
    const pages: PDFPage[] = [];
    
    // Limit parsing to avoid browser crashes on massive files
    // You can increase this if needed, but 100 is a safe upper bound for client-side
    const maxPages = Math.min(pdf.numPages, 100); 
    
    for (let i = 1; i <= maxPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      
      // Extract text items and join them with spaces
      // @ts-ignore: pdfjs-dist types mismatch fix
      const rawText = textContent.items.map((item: any) => item.str).join(' ');
      
      // Clean up extra whitespace but keep structure
      const cleanText = rawText.replace(/\s+/g, ' ').trim();

      if (cleanText.length > 0) {
        // 1. Store structured page data
        pages.push({
          pageNumber: i,
          text: cleanText
        });

        // 2. Build full text for legacy support
        fullText += `\n--- Page ${i} ---\n${cleanText}`;
      }
    }

    return {
      fullText,
      pages,
      pageCount: pdf.numPages
    };

  } catch (e) { 
      console.error("PDF Extraction Error:", e);
      // Return empty structure on fail to prevent UI crash
      return { fullText: "", pages: [], pageCount: 0 }; 
  }
};

/**
 * Legacy wrapper to keep existing components working without refactoring everything.
 * It simply returns the full string as before.
 */
export const extractTextFromPDF = async (file: File): Promise<string> => {
  const result = await extractDataFromPDF(file);
  return result.fullText;
};