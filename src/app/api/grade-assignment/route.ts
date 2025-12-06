import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";
import { AppError, handleAPIError } from "@/lib/error-handler";
import { AIGradedResponse } from "@/types"; // ✅ Import Type

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY || "");

// Helper to safely extract JSON
function extractJSON(text: string): AIGradedResponse {
  try {
    // Try direct parse
    return JSON.parse(text) as AIGradedResponse;
  } catch {
    // Try finding JSON block
    const firstOpen = text.indexOf("{");
    const lastClose = text.lastIndexOf("}");

    if (firstOpen !== -1 && lastClose !== -1) {
      const jsonString = text.substring(firstOpen, lastClose + 1);
      try {
        // Clean potential control characters
        const cleaned = jsonString.replace(/[\n\r]/g, " ").replace(/\\n/g, "\\n");
        return JSON.parse(cleaned) as AIGradedResponse;
      } catch {
        throw new AppError("Malformed JSON in AI response", 500);
      }
    }
    throw new AppError("No JSON found in AI response", 500);
  }
}

export async function POST(req: Request) {
  try {
    const { assignmentTitle, assignmentDescription, studentText, maxPoints } = await req.json();

    if (!studentText || studentText.trim().length < 20) {
      throw new AppError(
        "⚠️ Could not read document text. The file might be a scanned image or empty.",
        400
      );
    }

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

    const model = genAI.getGenerativeModel({
      model: "gemini-2.0-flash-exp",
      generationConfig: { responseMimeType: "application/json" }
    });

    const result = await model.generateContent(prompt);
    const responseText = result.response.text();
    const jsonResponse: AIGradedResponse = extractJSON(responseText); // ✅ Typed

    return NextResponse.json(jsonResponse);
  } catch (error: unknown) { // ✅ Unknown is safer than any
    return handleAPIError(error);
  }
}