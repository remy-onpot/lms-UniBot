import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";
import { env } from '@/lib/env';
import { z } from "zod"; 
import { AppError, handleAPIError } from "@/lib/error-handler";
import { createClient } from "@/lib/supabase/server";
import { checkRateLimit } from "@/lib/rate-limit";

const genAI = new GoogleGenerativeAI(env.GOOGLE_GENERATIVE_AI_API_KEY || "");
export const runtime = "edge";

// Updated Schema to accept images
const chatRequestSchema = z.object({
  messages: z.array(z.any()), // History
  currentMessage: z.string(),
  images: z.array(z.object({
    inlineData: z.object({
      data: z.string(),
      mimeType: z.string()
    })
  })).optional(),
  materialId: z.string().uuid().optional(),
  documentContext: z.string().optional().nullable(),
});

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) throw new AppError("Unauthorized", 401);

    // Rate Limit Check
    const isAllowed = await checkRateLimit(user.id, 'chat');
    if (!isAllowed) throw new AppError("Rate limit exceeded.", 429);

    const body = await req.json();
    const { messages, currentMessage, images, documentContext } = chatRequestSchema.parse(body);

    // 🧠 ROUTER LOGIC 🧠
    const hasImages = images && images.length > 0;
    const complexityTriggers = ["calculate", "solve", "explain diagram", "analyze graph", "circuit"];
    const isComplex = complexityTriggers.some(t => currentMessage.toLowerCase().includes(t));

    // Select Model based on Task
    // If images OR complex math -> Use PRO (The Heavy Lifter)
    // Otherwise -> Use FLASH (The Speedster)
    const modelName = (hasImages || isComplex) ? "gemini-2.5-pro" : "gemini-2.5-flash";
    
    const model = genAI.getGenerativeModel({ 
        model: modelName,
        systemInstruction: `You are UniBot, an expert AI Tutor. 
        Context from document: ${documentContext?.slice(0, 20000) || 'None'}.
        If the user uploads an image, analyze it in detail.`
    });

    // Construct the payload
    // We send history + the new message/images
    const chat = model.startChat({
        history: messages.map((m: any) => ({
            role: m.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: m.content }]
        }))
    });

    // Send the new message (Text + Images)
    const newParts: any[] = [{ text: currentMessage }];
    if (hasImages) {
        newParts.push(...images); // Attach images to this turn
    }

    const result = await chat.sendMessageStream(newParts);

    // Stream back to client
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