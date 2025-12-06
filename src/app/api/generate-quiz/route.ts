import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";
import { quizConfigSchema } from "@/lib/validators";
import { AppError, handleAPIError } from "@/lib/error-handler";
import { AIGeneratedQuestion } from "@/types"; // ✅ Import Type

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY || "");

export async function POST(req: Request) {
  try {
    const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    if (!apiKey) throw new AppError("Missing API Key", 500);

    const body = await req.json();
    const validated = quizConfigSchema.parse(body);
    const { documentText, topic, difficulty, numQuestions, type } = validated;

    if (!documentText) throw new AppError("No text provided", 400);

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

    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" });
    const result = await model.generateContent(prompt);
    const text = result.response.text();

    // Extract JSON
    const cleanedText = text.replace(/```json|```/g, "").trim();
    const start = cleanedText.indexOf("[");
    const end = cleanedText.lastIndexOf("]");
    
    if (start === -1 || end === -1) throw new AppError("Invalid JSON from AI", 500);
    
    const quizData = JSON.parse(cleanedText.substring(start, end + 1)) as AIGeneratedQuestion[]; // ✅ Typed

    // Validate Structure
    if (!Array.isArray(quizData) || quizData.length === 0) {
      throw new AppError("AI returned empty quiz data", 500);
    }

    return NextResponse.json({ quiz: quizData });
  } catch (error: unknown) {
    return handleAPIError(error);
  }
}