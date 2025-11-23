import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY || "");

export const runtime = 'edge';

export async function POST(req: Request) {
  try {
    // 1. Validate API Key
    const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "Server configuration error: Missing API Key" }, 
        { status: 500 }
      );
    }

    // 2. Parse request body
    const { messages, documentContext } = await req.json();

    // 3. Build system instruction based on context
    let systemInstruction = "";
    
    if (documentContext && documentContext.length > 50) { 
      systemInstruction = `You are UniBot, an incredibly friendly, encouraging, and highly competent AI Teaching Assistant. 
You MUST use the following document content to answer the student's questions. 
If the answer is not in the document, you must state that you cannot find the information in the provided context.

DOCUMENT CONTENT:
${documentContext}`;
    } else {
      systemInstruction = `You are UniBot, an incredibly friendly, encouraging, and highly competent Global University Assistant. 
Your responses should be warm, concise, and focused on helping students navigate the platform or understand general academic concepts. 
Do NOT mention documents, PDFs, or context limitations.`;
    }

    // 4. Transform messages to Gemini format
    // Filter out system messages (like welcome messages with id='0')
    console.log("📥 Received messages:", JSON.stringify(messages, null, 2));
    
    const conversationContents = messages
      .filter((m: any) => m.id !== '0' && m.role !== 'system')
      .map((m: any) => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content || "" }],
      }));

    // ONLY prepend system instruction to the VERY FIRST user message in the entire conversation
    // Check if this is the first real message (conversation has only 1 message and it's a user message)
    if (conversationContents.length === 1 && conversationContents[0].role === 'user') {
      conversationContents[0].parts[0].text = `${systemInstruction}\n\nUser: ${conversationContents[0].parts[0].text}`;
    }

    // Debug: Log the structure being sent
    console.log("📤 Sending to Gemini API:");
    console.log("Message count:", conversationContents.length);
    console.log("First message:", JSON.stringify(conversationContents[0], null, 2));

    // 5. Create model WITHOUT system instruction in config
    const model = genAI.getGenerativeModel({ 
      model: "gemini-2.5-flash",
    });

    // 6. Generate streaming response - pass as object with contents property
    console.log("🔄 Calling Gemini API...");
    let result;
    try {
      result = await model.generateContentStream({
        contents: conversationContents
      });
      console.log("✅ Gemini API call successful");
    } catch (apiError: any) {
      console.error("❌ Gemini API Error:", apiError);
      console.error("❌ Error status:", apiError.status);
      console.error("❌ Error message:", apiError.message);
      throw apiError;
    }

    // 7. Create ReadableStream for response
    const stream = new ReadableStream({
      async start(controller) {
        try {
          let chunkCount = 0;
          for await (const chunk of result.stream) {
            const chunkText = chunk.text();
            chunkCount++;
            console.log(`📦 Chunk ${chunkCount}:`, chunkText.substring(0, 50) + "...");
            
            if (chunkText) {
              controller.enqueue(new TextEncoder().encode(chunkText));
            }
          }
          console.log(`✅ Stream completed. Total chunks: ${chunkCount}`);
          controller.close();
        } catch (error) {
          console.error("❌ Stream error:", error);
          controller.error(error);
        }
      },
    });

    return new NextResponse(stream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
      },
    });

  } catch (error: any) {
    console.error("❌ API Route Error:", error);
    console.error("Error details:", error.message);
    
    return NextResponse.json(
      { 
        error: "Failed to process chat request", 
        details: error.message 
      }, 
      { status: 500 }
    );
  }
}