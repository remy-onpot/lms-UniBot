import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";
import { AppError, handleAPIError } from "@/lib/error-handler";
import { createClient } from "@/lib/supabase/server"; // ✅ NEW IMPORT

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY || "");

// Helper function to extract JSON from mixed text
function extractJSON(text: string): any {
  try {
    return JSON.parse(text);
  } catch {
    const firstOpen = text.indexOf("{");
    const lastClose = text.lastIndexOf("}");

    if (firstOpen !== -1 && lastClose !== -1) {
      const jsonString = text.substring(firstOpen, lastClose + 1);
      try {
        return JSON.parse(jsonString);
      } catch {
        const cleaned = jsonString.replace(/[\n\r]/g, " ").replace(/\\n/g, "\\n");
        return JSON.parse(cleaned);
      }
    }

    throw new AppError("Could not extract valid JSON from AI response.", 500);
  }
}

export async function POST(req: Request) {
  try {
    // 1. SECURITY: Initialize Supabase (New Way)
    const supabase = await createClient();
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      throw new AppError("Unauthorized: You must be logged in to grade assignments.", 401);
    }

    const { assignmentTitle, assignmentDescription, studentText, maxPoints } = await req.json();

    if (!studentText || studentText.trim().length < 20) {
      throw new AppError(
        "⚠️ Could not read document text. The file might be a scanned image or empty.",
        400
      );
    }

    console.log(`📝 Grading for User ${session.user.id}: "${assignmentTitle}" | Length: ${studentText.length} chars`);

    const prompt = `
      You are a strict university professor. Grade this student submission based on the instructions.
      
      ASSIGNMENT TITLE: "${assignmentTitle}"
      INSTRUCTIONS: "${assignmentDescription}"
      MAX POINTS: ${maxPoints}
      
      STUDENT SUBMISSION START:
      ${studentText.slice(0, 25000)}
      STUDENT SUBMISSION END
      
      TASK:
      1. Evaluate relevance, accuracy, and depth.
      2. Assign a score out of ${maxPoints}.
      3. Flag if it seems AI-generated.
      
      CRITICAL: Return ONLY valid JSON. No markdown.
      
      JSON FORMAT:
      {
        "score": number,
        "is_ai_generated": boolean,
        "feedback": "Summary feedback string",
        "breakdown": {
          "reasoning": "Detailed explanation of score",
          "strengths": ["point 1", "point 2"],
          "weaknesses": ["point 1", "point 2"]
        }
      }
    `;

    const model = genAI.getGenerativeModel({
      model: "gemini-2.0-flash-exp",
      generationConfig: { responseMimeType: "application/json" }
    });

    const result = await model.generateContent(prompt);
    const responseText = result.response.text();

    console.log("🤖 AI Response Preview:", responseText.substring(0, 100));

    let jsonResponse;
    try {
      jsonResponse = extractJSON(responseText);
    } catch (err) {
      throw new AppError("Invalid response from AI. Could not parse JSON.", 500);
    }

    return NextResponse.json(jsonResponse);
  } catch (error: any) {
    return handleAPIError(error);
  }
}