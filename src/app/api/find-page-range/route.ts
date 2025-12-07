import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";
import { env } from '@/lib/env';
import { createClient } from "@/lib/supabase/server";
import { AppError, handleAPIError } from "@/lib/error-handler";
import { z } from "zod";

const genAI = new GoogleGenerativeAI(env.GOOGLE_GENERATIVE_AI_API_KEY || "");

const requestSchema = z.object({
  topicTitle: z.string().min(1),
  // We expect the client to send the first ~20 pages of text directly
  // to avoid re-downloading/parsing the huge PDF on the server every time.
  tocContext: z.string().min(100, "Table of Contents context is too short"),
});

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new AppError("Unauthorized", 401);

    const body = await req.json();
    const { topicTitle, tocContext } = requestSchema.parse(body);

    const prompt = `
      You are a research assistant. 
      Analyze this Table of Contents (TOC) context from a textbook.
      Find the chapter or section that best matches the topic: "${topicTitle}".
      
      Return a JSON object with the estimated page range:
      {
        "start_page": number,
        "end_page": number,
        "match_name": "The exact chapter title you found"
      }
      
      If you can't find a clear match, return start_page: 0, end_page: 0.
      
      TOC CONTEXT:
      ${tocContext.slice(0, 30000)} // Limit context size
    `;

    const model = genAI.getGenerativeModel({ 
      model: "gemini-2.5-flash",
      generationConfig: { responseMimeType: "application/json" }
    });

    const result = await model.generateContent(prompt);
    const responseData = JSON.parse(result.response.text());

    return NextResponse.json(responseData);

  } catch (error) {
    return handleAPIError(error);
  }
}