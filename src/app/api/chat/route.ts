import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";
import { env } from '@/lib/env';
import { z } from "zod"; 
import { AppError, handleAPIError } from "@/lib/error-handler";
import { createClient } from "@/lib/supabase/server";
import { checkRateLimit } from "@/lib/rate-limit";
import { canAccessCourse } from "@/lib/auth-utils";

const genAI = new GoogleGenerativeAI(env.GOOGLE_GENERATIVE_AI_API_KEY || "");
export const runtime = "edge";

const chatRequestSchema = z.object({
  messages: z.array(z.object({
    role: z.enum(['user', 'assistant', 'system']),
    content: z.string().trim().min(1).max(10000),
    id: z.string().optional(),
  })).min(1),
  documentContext: z.string().max(50000).optional(),
  materialId: z.string().uuid().optional(),
});

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) throw new AppError("Unauthorized", 401);

    const isAllowed = await checkRateLimit(session.user.id, 'chat');
    if (!isAllowed) throw new AppError("Rate limit exceeded.", 429);

    const body = await req.json();
    const { messages, documentContext, materialId } = chatRequestSchema.parse(body);

    if (materialId) {
      const { data: material } = await supabase
        .from('materials')
        .select('course_id')
        .eq('id', materialId)
        .single();

      if (material) {
        const hasAccess = await canAccessCourse(supabase, session.user.id, material.course_id);
        if (!hasAccess) throw new AppError("Forbidden", 403);
      }
    }

    const conversationContents = messages
      .filter((m) => m.role !== "system")
      .map((m) => ({
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: m.content }],
      }));

    let systemInstruction = `You are UniBot, an AI Teaching Assistant.`;
    if (documentContext) {
        systemInstruction += ` Use this context: ${documentContext}`;
    }

    const isFirstUserMessage = conversationContents.length === 1 && conversationContents[0].role === "user";
    if (isFirstUserMessage) {
      conversationContents[0].parts[0].text = `${systemInstruction}\n\nUser: ${conversationContents[0].parts[0].text}`;
    }

    // ✅ FIX: Use Gemini 2.5 Flash
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    const result = await model.generateContentStream({ contents: conversationContents });

    const stream = new ReadableStream({
      async start(controller) {
        for await (const chunk of result.stream) {
          const text = chunk.text();
          if (text) controller.enqueue(new TextEncoder().encode(text));
        }
        controller.close();
      },
    });

    return new NextResponse(stream, { headers: { "Content-Type": "text/plain" } });

  } catch (error) {
    return handleAPIError(error);
  }
}