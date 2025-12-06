import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";
import { AppError, handleAPIError } from "../../../lib/error-handler"; 
import { createClient } from "../../../lib/supabase/server"; 
import { checkRateLimit } from "../../../lib/rate-limit"; 
import { logger } from "../../../lib/logger"; // ✅ Import Logger

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY || "");
export const runtime = "edge";

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      throw new AppError("Unauthorized", 401);
    }

    const isAllowed = await checkRateLimit(session.user.id, 'chat');
    if (!isAllowed) {
      throw new AppError("Rate limit exceeded. Please try again later.", 429);
    }

    if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
      throw new AppError("Server configuration error", 500);
    }

    const { messages, documentContext } = await req.json();

    logger.info("📥 Received chat request from:", session.user.id); // ✅ Logger

    const conversationContents = messages
      .filter((m: any) => m.id !== "0" && m.role !== "system")
      .map((m: any) => ({
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: m.content || "" }],
      }));

    let systemInstruction = `You are UniBot, an AI Teaching Assistant.`;
    if (documentContext) {
        systemInstruction += ` Use this context: ${documentContext}`;
    }

    const isFirstUserMessage = conversationContents.length === 1 && conversationContents[0].role === "user";
    if (isFirstUserMessage) {
      conversationContents[0].parts[0].text = `${systemInstruction}\n\nUser: ${conversationContents[0].parts[0].text}`;
    }

    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" });
    logger.info("🔄 Calling Gemini API..."); // ✅ Logger
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
    logger.error("Chat API Error:", error); // ✅ Logger
    return handleAPIError(error);
  }
}