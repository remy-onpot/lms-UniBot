export const extractTextFromPDF = async (file: File): Promise<string> => {
  try {
    const pdfjsLib = await import('pdfjs-dist');
    // Ensure you have the worker file in your public folder
    pdfjsLib.GlobalWorkerOptions.workerSrc = `/pdf.worker.min.mjs`;

    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    let fullText = "";
    
    // Limit to first 15 pages to save tokens/processing cost
    const maxPages = Math.min(pdf.numPages, 15); 
    
    for (let i = 1; i <= maxPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      // @ts-ignore
      const pageText = textContent.items.map((item: any) => item.str).join(' ');
      fullText += `\n${pageText}`;
    }
    return fullText;
  } catch (e) { 
      console.error("PDF Extraction Error:", e);
      return ""; 
  }
};