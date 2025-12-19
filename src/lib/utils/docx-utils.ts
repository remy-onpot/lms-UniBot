import mammoth from 'mammoth';

export const extractDataFromDocx = async (file: File): Promise<string> => {
  try {
    const arrayBuffer = await file.arrayBuffer();
    
    // Convert .docx to semantic HTML (Perfect for Tiptap)
    const result = await mammoth.convertToHtml({ arrayBuffer });
    
    // Result.value is the clean HTML
    if (!result.value) {
        throw new Error("No text found in document");
    }

    return result.value;
  } catch (error) {
    console.error("Docx Extraction Error:", error);
    throw new Error("Failed to read Word document");
  }
};