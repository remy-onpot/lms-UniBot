import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";
import { quizConfigSchema } from "@/lib/validators";
import { AppError, handleAPIError } from "@/lib/error-handler";
import { createClient } from "@/lib/supabase/server"; // ✅ NEW IMPORT
import { z } from "zod";

const genAI = new GoogleGenerativeAI(
  process.env.GOOGLE_GENERATIVE_AI_API_KEY || ""
);

export async function POST(req: Request) {
  try {
    // 1. SECURITY: Initialize Supabase (New Way)
    const supabase = await createClient();
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      throw new AppError("Unauthorized: You must be logged in to generate quizzes.", 401);
    }

    // 2. Check API Key
    const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    if (!apiKey) {
      throw new AppError("Server configuration error: Missing API Key", 500);
    }

    // 3. Parse body
    const body = await req.json();

    // 4. Validate with Zod
    const validated = quizConfigSchema.parse(body);

    const { documentText, topic, difficulty, numQuestions, type } = validated;

    if (!documentText) {
      throw new AppError("No text provided", 400);
    }

    console.log(`📝 Generating quiz for User ${session.user.id}:`, {
      topic,
      difficulty,
      numQuestions,
      type,
    });

    // 5. Prompt
    const prompt = `
You are a strict, no-nonsense teacher with these qualities:
- You never invent information that is not in the provided document.
- You enforce precision, accuracy, and discipline in all questions.
- You generate challenging and thought-provoking questions even for simple topics.
- You avoid vague, overly easy, or repetitive questions.
- You maintain a formal, academic tone at all times.
- You ensure every question is answerable directly from the document.
- You do not provide hints or commentary unless required by the output format.

Generate a quiz based ONLY on the provided text.

Topic/Chapter Focus: ${topic || "General Review"}
Difficulty Level: ${difficulty || "Medium"}
Number of Questions: ${numQuestions || 5}
Question Type: ${type || "Multiple Choice"}

DOCUMENT TEXT:
${documentText.slice(0, 15000)}

CRITICAL INSTRUCTIONS:
- Generate EXACTLY ${numQuestions || 5} questions.
- All questions must be based ONLY on the document text provided above.
- You MUST respond with ONLY a valid JSON array.
- No markdown formatting.
- No code blocks.
- No extra text, no explanations outside the JSON.
- Output must begin with '[' and end with ']'.

OUTPUT FORMAT:
[
  {
    "question": "Question text here?",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correct_answer": "Option A",
    "explanation": "Short explanation here."
  }
]

Now generate the quiz in the exact JSON format specified above:
    `;

    // 6. Call Gemini
    const model = genAI.getGenerativeModel({
      model: "gemini-2.0-flash-exp",
    });

    const result = await model.generateContent(prompt);
    const text = result.response.text();

    console.log("📦 Raw AI response:", text.substring(0, 200));

    // 7. Extract JSON only
    let cleanedText = text
      .trim()
      .replace(/```json/gi, "")
      .replace(/```/g, "");

    const start = cleanedText.indexOf("[");
    const end = cleanedText.lastIndexOf("]");

    if (start === -1 || end === -1) {
      throw new AppError("AI did not return a valid JSON array.", 500);
    }

    cleanedText = cleanedText.substring(start, end + 1);

    // 8. Parse JSON
    let quizData;
    try {
      quizData = JSON.parse(cleanedText);
    } catch (err: any) {
      throw new AppError("Malformed JSON returned by the AI.", 500);
    }

    // 9. Validate quiz structure
    if (!Array.isArray(quizData) || quizData.length === 0) {
      throw new AppError("Quiz data is not a valid non-empty array.", 500);
    }

    quizData.forEach((q: any, i: number) => {
      if (!q.question || !q.options || !q.correct_answer) {
        throw new AppError(
          `Question ${i + 1} is missing required fields.`,
          500
        );
      }
    });

    return NextResponse.json({ quiz: quizData });
  } catch (error) {
    return handleAPIError(error);
  }
}