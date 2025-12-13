import { GoogleGenerativeAI } from "@google/generative-ai";
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { z } from "zod";

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY!);

// Validation Schema
const chatRequestSchema = z.object({
  messages: z.array(z.any()), // History
  currentMessage: z.string(),
  images: z.array(z.string()).optional(), // Base64 images for Vision
  materialId: z.string().uuid().optional(), // The PDF we are chatting about
});

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { messages, currentMessage, images, materialId } = chatRequestSchema.parse(body);

    let contextText = "";

    // 🧠 SERVER-SIDE RAG (The "Iron Vault" Logic)
    if (materialId) {
       // 1. Generate Embedding for the User's Query
       const embeddingModel = genAI.getGenerativeModel({ model: "embedding-001" });
       const result = await embeddingModel.embedContent(currentMessage);
       const embedding = result.embedding.values;

       // 2. Search Database for matching PDF sections
       // This uses the secure SQL function we created in Phase 1
       const { data: chunks, error } = await supabase.rpc('match_document_sections', {
          query_embedding: embedding,
          match_threshold: 0.5, // Only relevant matches (>50% similarity)
          match_count: 5,       // Top 5 chunks (approx 2000 words)
          filter_material_id: materialId
       });

       if (error) {
         console.error("Vector Search Error:", error);
       } else if (chunks && chunks.length > 0) {
         contextText = chunks.map((c: any) => c.content).join("\n\n---\n\n");
       } else {
         contextText = "No directly relevant text found in the document for this specific question.";
       }
    }

    // 3. Select Model (Vision vs Text)
    // Use "gemini-1.5-flash" for speed/cost. It has a large context window (1M tokens).
    const model = genAI.getGenerativeModel({ 
        model: "gemini-2.5-flash", 
        systemInstruction: `
          You are UniBot, an expert academic tutor.
          
          INSTRUCTIONS:
          1. Answer the student's question clearly and concisely.
          2. STRICTLY usage the provided DOCUMENT CONTEXT below.
          3. If the answer is not in the context, say "I couldn't find that in the document, but based on general knowledge..."
          4. If images are provided, analyze them.

          DOCUMENT CONTEXT:
          ${contextText}
        `
    });

    // 4. Prepare History & Payload
    const chat = model.startChat({
        history: messages.map((m: any) => ({
            role: m.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: m.content }]
        }))
    });

    const parts: any[] = [{ text: currentMessage }];
    
    // Add Images if present (Base64)
    if (images && images.length > 0) {
        images.forEach(img => {
            // Assume format: "data:image/jpeg;base64,..."
            const base64Data = img.split(',')[1];
            const mimeType = img.substring(img.indexOf(':') + 1, img.indexOf(';'));
            if (base64Data) {
                parts.push({ inlineData: { data: base64Data, mimeType } });
            }
        });
    }

    // 5. Generate Stream
    const result = await chat.sendMessageStream(parts);

    const stream = new ReadableStream({
      async start(controller) {
        try {
            for await (const chunk of result.stream) {
              const text = chunk.text();
              if (text) controller.enqueue(new TextEncoder().encode(text));
            }
            controller.close();
        } catch (e) {
            controller.error(e);
        }
      },
    });

    return new NextResponse(stream, { headers: { "Content-Type": "text/plain" } });

  } catch (error: any) {
    console.error("Chat API Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}