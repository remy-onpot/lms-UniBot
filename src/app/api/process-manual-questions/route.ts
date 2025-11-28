import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";
import { AppError, handleAPIError } from "@/lib/error-handler";

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY || "");

export async function POST(req: Request) {
  try {
    const { questions, action, topicId } = await req.json();

    if (!questions || !action) {
      throw new AppError("Missing required fields: questions or action", 400);
    }

    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash"
    });

    let prompt = "";

    if (action === "enhance") {
      prompt = `You are a quiz improvement assistant. Take these quiz questions and:
1. Rephrase them for clarity and better understanding
2. Improve the options to be more precise
3. Add helpful explanations
4. Keep the same difficulty level

Original questions:
${questions}

Return ONLY a JSON array in this structure:
[
  {
    "question": "Enhanced question text",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correct_answer": "Option A",
    "explanation": "Why this is correct"
  }
]`;
    } else {
      prompt = `Convert these questions into a standardized quiz format.

Raw input:
${questions}

Return ONLY a JSON array in this structure:
[
  {
    "question": "Question text",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correct_answer": "Correct option",
    "explanation": "Brief explanation"
  }
]`;
    }

    const result = await model.generateContent(prompt);
    const aiText = result.response.text().trim();

    const firstBracket = aiText.indexOf("[");
    const lastBracket = aiText.lastIndexOf("]");

    if (firstBracket === -1 || lastBracket === -1) {
      throw new AppError("AI did not return a valid JSON array.", 500);
    }

    const cleaned = aiText.substring(firstBracket, lastBracket + 1);
    let quizData;

    try {
      quizData = JSON.parse(cleaned);
    } catch {
      throw new AppError("Failed to parse AI JSON output.", 500);
    }

    return NextResponse.json({ quiz: quizData });

  } catch (error) {
    return handleAPIError(error);
  }
}
