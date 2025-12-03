import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";
import { AppError, handleAPIError } from "@/lib/error-handler";
import { createClient } from "@/lib/supabase/server"; // ✅ Import the new helper

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY || "");
export const runtime = "edge";

export async function POST(req: Request) {
  try {
    // 1. SECURITY: Initialize Supabase (New Way)
    const supabase = await createClient(); // ✅ Await the client creation
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      throw new AppError("Unauthorized: You must be logged in to use the AI assistant.", 401);
    }

    // 2. Validate API key
    const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    if (!apiKey) {
      throw new AppError("Server configuration error: Missing API Key", 500);
    }

    // 3. Parse request
    const { messages, documentContext } = await req.json();
    if (!messages || !Array.isArray(messages)) {
      throw new AppError("Invalid request: messages must be an array", 400);
    }

    // 4. Build system instruction
    let systemInstruction = "";
    if (documentContext && documentContext.length > 50) {
      systemInstruction = `You are UniBot, an incredibly friendly, encouraging, and highly competent AI Teaching Assistant.
You MUST use the following document content to answer the student's questions.
If the answer is not in the document, you must state that you cannot find the information.

DOCUMENT CONTENT:
${documentContext}`;
    } else {
      systemInstruction = `You are UniBot, an incredibly friendly, encouraging, and highly competent Global University Assistant.
Your responses should be warm, concise, and focused on helping students navigate the platform or understand general concepts.
Do NOT mention documents, PDFs, or context limitations.`;
    }

    console.log(`📥 Received messages from User ${session.user.id}:`, JSON.stringify(messages, null, 2));

    // 5. Format messages for Gemini
    const conversationContents = messages
      .filter((m: any) => m.id !== "0" && m.role !== "system")
      .map((m: any) => ({
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: m.content || "" }],
      }));

    // Determine if this is the first message
    const isFirstUserMessage =
      conversationContents.length === 1 &&
      conversationContents[0].role === "user";

    if (isFirstUserMessage) {
      conversationContents[0].parts[0].text = `${systemInstruction}\n\nUser: ${conversationContents[0].parts[0].text}`;
    }

    // 6. Load model
    const model = genAI.getGenerativeModel({
      model: "gemini-2.0-flash-exp",
    });

    // 7. Generate streaming response
    const result = await model.generateContentStream({
      contents: conversationContents,
    });

    // Build stream
    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of result.stream) {
            const chunkText = chunk.text();
            if (chunkText) {
              controller.enqueue(new TextEncoder().encode(chunkText));
            }
          }
          controller.close();
        } catch (error) {
          controller.error(error);
        }
      },
    });

    return new NextResponse(stream, {
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });

  } catch (error) {
    return handleAPIError(error);
  }
}