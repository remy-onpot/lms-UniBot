import { GoogleGenerativeAI } from "@google/generative-ai";
import { createClient as createServerClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { env } from '@/lib/env';
import { z } from "zod"; 
import { AppError, handleAPIError } from "@/lib/error-handler";

const genAI = new GoogleGenerativeAI(env.GOOGLE_GENERATIVE_AI_API_KEY || "");
const supabaseAdmin = createServerClient(
  env.NEXT_PUBLIC_SUPABASE_URL!,
  env.SUPABASE_SERVICE_ROLE_KEY!
);

// ✅ Define Validation Schema
const processDocSchema = z.object({
  materialId: z.string().uuid(),
  text: z.string().min(50, "Document text is too short").max(500000, "Document text is too large"),
});

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new AppError("Unauthorized", 401);

    const body = await req.json();
    
    // ✅ Validate Input
    const { materialId, text } = processDocSchema.parse(body);

    // Ownership Check (from Step 1)
    const { data: material } = await supabase
      .from('materials')
      .select('course_id, courses(class_id, classes(lecturer_id))')
      .eq('id', materialId)
      .single();

    // @ts-ignore
    const isOwner = material?.courses?.classes?.lecturer_id === session.user.id;
    if (!isOwner) {
       const { data: userProfile } = await supabase.from('users').select('role').eq('id', session.user.id).single();
       if (userProfile?.role !== 'super_admin') {
          throw new AppError("Forbidden", 403);
       }
    }

    console.log(`🔄 Processing document ${materialId} (${text.length} chars)...`);

    const chunkSize = 500;
    const overlap = 100;
    const chunks: string[] = [];

    for (let i = 0; i < text.length; i += chunkSize - overlap) {
      chunks.push(text.slice(i, i + chunkSize));
    }

    const embeddingModel = genAI.getGenerativeModel({ model: "embedding-001" });

    const insertionPromises = chunks.map(async (chunk, index) => {
      try {
        const result = await embeddingModel.embedContent(chunk);
        const embedding = result.embedding.values;
        const pageNumber = Math.floor((index * (chunkSize - overlap)) / 3000) + 1;

        return {
          material_id: materialId,
          content: chunk,
          page_number: pageNumber,
          embedding,
        };
      } catch (err) {
        console.error("Embedding error", err);
        return null;
      }
    });

    const rows = (await Promise.all(insertionPromises)).filter(r => r !== null);

    if (rows.length === 0) throw new AppError("Failed to generate embeddings", 500);

    const { error } = await supabaseAdmin.from("document_sections").insert(rows);
    if (error) throw new AppError(error.message, 500);

    return NextResponse.json({ success: true, chunks: rows.length });

  } catch (error) {
    return handleAPIError(error);
  }
}