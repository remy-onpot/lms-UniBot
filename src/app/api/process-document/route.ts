import { GoogleGenerativeAI } from "@google/generative-ai";
import { createClient } from '@supabase/supabase-js';
import { NextResponse } from "next/server";

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY || "");
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  try {
    const { materialId, text } = await req.json();

    if (!text || !materialId) {
      return NextResponse.json({ error: "Missing text or materialId" }, { status: 400 });
    }

    console.log(`🔄 Processing document ${materialId} (${text.length} chars)...`);

    // 1. Chunk the text (simple strategy: 500 chars with overlap)
    const chunkSize = 500;
    const overlap = 100;
    const chunks: string[] = [];
    
    for (let i = 0; i < text.length; i += (chunkSize - overlap)) {
      chunks.push(text.slice(i, i + chunkSize));
    }

    console.log(`📦 Created ${chunks.length} chunks.`);

    // 2. Generate Embeddings & Store in Supabase
    const embeddingModel = genAI.getGenerativeModel({ model: "embedding-001" });
    
    const insertionPromises = chunks.map(async (chunk, index) => {
      try {
        const result = await embeddingModel.embedContent(chunk);
        const embedding = result.embedding.values;

        // Basic page estimation (approx 3000 chars per page)
        const pageNumber = Math.floor((index * (chunkSize - overlap)) / 3000) + 1;

        return {
          material_id: materialId,
          content: chunk,
          page_number: pageNumber,
          embedding: embedding
        };
      } catch (e) {
        console.error("Embedding error for chunk", index, e);
        return null;
      }
    });

    const rows = (await Promise.all(insertionPromises)).filter(r => r !== null);

    if (rows.length > 0) {
      const { error } = await supabase.from('document_sections').insert(rows);
      if (error) throw error;
    }

    console.log(`✅ Successfully stored ${rows.length} embeddings.`);

    return NextResponse.json({ success: true, chunks: rows.length });

  } catch (error: any) {
    console.error("❌ Document Processing Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}