import { GoogleGenerativeAI } from "@google/generative-ai";
import { createClient as createServerClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { z } from "zod";

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY!);

// Admin client to bypass RLS for insertions if needed, 
// OR we can use the user's client if RLS policies allow "insert own documents".
// For safety, using Service Role is reliable for background tasks, 
// BUT we must verify ownership first.
const supabaseAdmin = createServerClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const processDocSchema = z.object({
  materialId: z.string().uuid(),
  text: z.string().min(50, "Document too short").max(1000000, "Document too large"), // 1MB text limit
});

export async function POST(req: Request) {
  try {
    // 1. Auth & Ownership Check
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { materialId, text } = processDocSchema.parse(body);

    // Verify User Owns the Class/Course this material belongs to
    const { data: material } = await supabase
      .from('materials')
      .select('course_id, courses(class_id, classes(lecturer_id))')
      .eq('id', materialId)
      .single();

    // @ts-ignore (Nested query types can be tricky, verifying safely)
    const lecturerId = material?.courses?.classes?.lecturer_id;
    
    // Allow Lecturers (Owners) OR Super Admins
    if (lecturerId !== user.id) {
       // Check if Super Admin
       const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single();
       if (profile?.role !== 'super_admin') {
           return NextResponse.json({ error: "Forbidden: You do not own this material" }, { status: 403 });
       }
    }

    // 2. Chunking Strategy (Recursive Character Splitter Logic)
    // We want chunks of ~1000 chars with some overlap to preserve context
    const CHUNK_SIZE = 1000;
    const OVERLAP = 200;
    const chunks: string[] = [];

    for (let i = 0; i < text.length; i += (CHUNK_SIZE - OVERLAP)) {
      chunks.push(text.slice(i, i + CHUNK_SIZE));
    }

    console.log(`Processing ${chunks.length} chunks for Material ${materialId}`);

    // 3. Generate Embeddings (Batching to avoid API Limits)
    const embeddingModel = genAI.getGenerativeModel({ model: "embedding-001" });
    const rows = [];
    
    // Process in batches of 10 to be safe
    const BATCH_SIZE = 10;
    for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
        const batch = chunks.slice(i, i + BATCH_SIZE);
        const promises = batch.map(async (chunk, batchIndex) => {
            try {
                const result = await embeddingModel.embedContent(chunk);
                const absoluteIndex = i + batchIndex;
                return {
                    material_id: materialId,
                    content: chunk,
                    page_number: Math.floor(absoluteIndex / 5) + 1, // Rough estimate
                    embedding: result.embedding.values
                };
            } catch (err) {
                console.error("Embedding generation failed for chunk", err);
                return null;
            }
        });
        
        const results = await Promise.all(promises);
        rows.push(...results.filter(r => r !== null));
    }

    // 4. Save to "Iron Vault" (Database)
    // We use supabaseAdmin to ensure we can write to the vector table 
    // regardless of strict RLS on the 'document_sections' table if setup that way.
    const { error } = await supabaseAdmin
        .from('document_sections')
        .insert(rows);

    if (error) throw error;

    return NextResponse.json({ success: true, chunks: rows.length });

  } catch (error: any) {
    console.error("Processing Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}