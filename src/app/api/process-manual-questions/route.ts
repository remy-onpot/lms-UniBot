import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";
import { env } from '@/lib/env';
import { z } from "zod"; 
import { AppError, handleAPIError } from "@/lib/error-handler";
import { createClient } from "@/lib/supabase/server";

const genAI = new GoogleGenerativeAI(env.GOOGLE_GENERATIVE_AI_API_KEY || "");

// ✅ Define Validation Schema
const manualQuestionsSchema = z.object({
  questions: z.string().min(10, "Please provide more question content").max(50000),
  action: z.enum(['convert', 'enhance']),
  topicId: z.string().uuid(),
});

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new AppError("Unauthorized", 401);

    const body = await req.json();
    
    // ✅ Validate Input
    const { questions, action, topicId } = manualQuestionsSchema.parse(body);

    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    let prompt = "";
    if (action === "enhance") {
      prompt = `You are a quiz improvement assistant... (Enhance Prompt) ... Original: ${questions} ... JSON output...`;
    } else {
      prompt = `Convert these questions... (Convert Prompt) ... Input: ${questions} ... JSON output...`;
    }

    const result = await model.generateContent(prompt);
    const aiText = result.response.text().trim();

    const firstBracket = aiText.indexOf("[");
    const lastBracket = aiText.lastIndexOf("]");

    if (firstBracket === -1 || lastBracket === -1) {
      throw new AppError("AI did not return a valid JSON array.", 500);
    }

    const cleaned = aiText.substring(firstBracket, lastBracket + 1);
    const quizData = JSON.parse(cleaned);

    return NextResponse.json({ quiz: quizData });

  } catch (error) {
    return handleAPIError(error);
  }
}