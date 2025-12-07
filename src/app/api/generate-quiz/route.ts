import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";
import { env } from '@/lib/env';
import { quizConfigSchema } from "@/lib/validators";
import { AppError, handleAPIError } from "@/lib/error-handler";
import { AIGeneratedQuestion } from "@/types";
import { createClient } from "@/lib/supabase/server";
import { checkRateLimit } from "@/lib/rate-limit";

const genAI = new GoogleGenerativeAI(env.GOOGLE_GENERATIVE_AI_API_KEY || "");

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      throw new AppError("Unauthorized", 401);
    }

    const isAllowed = await checkRateLimit(session.user.id, 'quiz_generation');
    if (!isAllowed) {
      throw new AppError("Rate limit exceeded. Please wait.", 429);
    }

    const body = await req.json();
    const validated = quizConfigSchema.parse(body);
    const { documentText, topic, difficulty, numQuestions, type } = validated;

    const prompt = `Generate a ${difficulty} ${type} quiz with ${numQuestions} questions on "${topic}". 
    Context: ${documentText.slice(0, 15000)}. 
    
    Return ONLY a JSON array:
    [
      {
        "question": "Question text",
        "options": ["A", "B", "C", "D"],
        "correct_answer": "A",
        "explanation": "Why it is correct"
      }
    ]`;

    // ✅ FIX: Use the active Gemini 2.5 Flash model
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    try {
      const result = await model.generateContent(prompt);
      const text = result.response.text();

      const cleanedText = text.replace(/```json|```/g, "").trim();
      const start = cleanedText.indexOf("[");
      const end = cleanedText.lastIndexOf("]");
      
      if (start === -1 || end === -1) throw new AppError("Invalid JSON from AI", 500);
      
      const quizData = JSON.parse(cleanedText.substring(start, end + 1)) as AIGeneratedQuestion[];

      return NextResponse.json({ quiz: quizData });

    } catch (apiError: any) {
      if (apiError.status === 429 || apiError.message?.includes('429')) {
        console.warn("Google AI Rate Limit Hit");
        throw new AppError("AI is currently busy. Switching to backup mode.", 503);
      }
      throw apiError;
    }

  } catch (error: unknown) {
    return handleAPIError(error);
  }
}