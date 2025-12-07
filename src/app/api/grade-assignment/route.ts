import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";
import { env } from '@/lib/env';
import { z } from "zod"; 
import { AppError, handleAPIError } from "@/lib/error-handler";
import { AIGradedResponse } from "@/types";
import { createClient } from "@/lib/supabase/server";
import { checkRateLimit } from "@/lib/rate-limit";

const genAI = new GoogleGenerativeAI(env.GOOGLE_GENERATIVE_AI_API_KEY || "");

const gradingSchema = z.object({
  assignmentTitle: z.string().min(1).max(200),
  assignmentDescription: z.string().min(1).max(2000),
  studentText: z.string().min(20).max(100000),
  maxPoints: z.number().int().min(1).max(1000),
});

function extractJSON(text: string): AIGradedResponse {
  try {
    return JSON.parse(text) as AIGradedResponse;
  } catch {
    const firstOpen = text.indexOf("{");
    const lastClose = text.lastIndexOf("}");
    if (firstOpen !== -1 && lastClose !== -1) {
      const jsonString = text.substring(firstOpen, lastClose + 1);
      try {
        const cleaned = jsonString.replace(/[\n\r]/g, " ").replace(/\\n/g, "\\n");
        return JSON.parse(cleaned) as AIGradedResponse;
      } catch { throw new AppError("Malformed JSON", 500); }
    }
    throw new AppError("No JSON found", 500);
  }
}

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new AppError("Unauthorized", 401);

    const isAllowed = await checkRateLimit(session.user.id, 'grading');
    if (!isAllowed) throw new AppError("Rate limit exceeded.", 429);

    const body = await req.json();
    const { assignmentTitle, assignmentDescription, studentText, maxPoints } = gradingSchema.parse(body);

    const prompt = `
      You are a strict university professor. Grade this student submission.
      
      ASSIGNMENT: "${assignmentTitle}"
      INSTRUCTIONS: "${assignmentDescription}"
      MAX POINTS: ${maxPoints}
      CONTENT: "${studentText.slice(0, 25000)}"
      
      Return ONLY valid JSON with this structure:
      {
        "score": number,
        "is_ai_generated": boolean,
        "feedback": "Summary feedback",
        "breakdown": {
          "reasoning": "Explanation",
          "strengths": ["point 1"],
          "weaknesses": ["point 1"]
        }
      }
    `;

    // ✅ FIX: Use Gemini 2.5 Flash
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      generationConfig: { responseMimeType: "application/json" }
    });

    const result = await model.generateContent(prompt);
    const responseText = result.response.text();
    const jsonResponse = extractJSON(responseText);

    return NextResponse.json(jsonResponse);
  } catch (error) {
    return handleAPIError(error);
  }
}