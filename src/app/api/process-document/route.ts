import { GoogleGenerativeAI } from "@google/generative-ai";
import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { AppError, handleAPIError } from "@/lib/error-handler";

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY || "");
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  try {
    const { materialId, text } = await req.json();

    if (!materialId || !text) {
      throw new AppError("Missing text or materialId", 400);
    }

    console.log(`🔄 Processing document ${materialId} (${text.length} chars)...`);

    // Chunking logic
    const chunkSize = 500;
    const overlap = 100;
    const chunks: string[] = [];

    for (let i = 0; i < text.length; i += chunkSize - overlap) {
      chunks.push(text.slice(i, i + chunkSize));
    }

    console.log(`📦 Created ${chunks.length} chunks.`);

    // Embedding model
    const embeddingModel = genAI.getGenerativeModel({ model: "embedding-001" });

    const insertionPromises = chunks.map(async (chunk, index) => {
      try {
        const result = await embeddingModel.embedContent(chunk);
        const embedding = result.embedding.values;

        // Estimate page number
        const pageNumber = Math.floor((index * (chunkSize - overlap)) / 3000) + 1;

        return {
          material_id: materialId,
          content: chunk,
          page_number: pageNumber,
          embedding,
        };
      } catch (err) {
        console.error("Embedding error for chunk", index, err);
        return null;
      }
    });

    const rows = (await Promise.all(insertionPromises)).filter(r => r !== null);

    if (rows.length === 0) {
      throw new AppError("Failed to generate embeddings for all chunks.", 500);
    }

    const { error } = await supabase.from("document_sections").insert(rows);
    if (error) throw new AppError(error.message, 500);

    console.log(`✅ Successfully stored ${rows.length} embeddings.`);

    return NextResponse.json({ success: true, chunks: rows.length });

  } catch (error) {
    return handleAPIError(error);
  }
}
    