import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";
import { quizConfigSchema } from "@/lib/validators";
import { z } from "zod";

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY || "");

export async function POST(req: Request) {
  try {
    const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "Server configuration error: Missing API Key" },
        { status: 500 }
      );
    }

    // 1. Read body & validate using Zod
    const body = await req.json();

    const validated = quizConfigSchema.parse(body);

    const { documentText, topic, difficulty, numQuestions, type } = validated;

    if (!documentText) {
      return NextResponse.json({ error: "No text provided" }, { status: 400 });
    }

    console.log("📝 Generating quiz with params:", {
      topic,
      difficulty,
      numQuestions,
      type,
    });

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

OUTPUT FORMAT (respond with ONLY this structure):
[
  {
    "question": "Question text here?",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correct_answer": "Option A",
    "explanation": "Short explanation of why this is correct."
  }
]

Now generate the quiz in the exact JSON format specified above:
`;


    // 3. Call Gemini
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
    });

    console.log("🔄 Calling Gemini API for quiz generation...");

    const result = await model.generateContent(prompt);
    const text = result.response.text();

    console.log("📦 Raw AI response (first 200 chars):", text.substring(0, 200));

    // 4. Clean JSON
    let cleanedText = text.trim();
    cleanedText = cleanedText
      .replace(/```json\s*/g, "")
      .replace(/```\s*/g, "");

    const firstBracket = cleanedText.indexOf("[");
    const lastBracket = cleanedText.lastIndexOf("]");

    if (firstBracket === -1 || lastBracket === -1) {
      console.error("❌ No JSON array found");
      return NextResponse.json(
        {
          error: "AI did not return valid JSON array.",
          raw_output: text,
        },
        { status: 500 }
      );
    }

    cleanedText = cleanedText.substring(firstBracket, lastBracket + 1);

    console.log(
      "🧹 Cleaned JSON (first 200 chars):",
      cleanedText.substring(0, 200)
    );

    // 5. Parse and validate quiz output
    try {
      const quizData = JSON.parse(cleanedText);

      if (!Array.isArray(quizData) || quizData.length === 0) {
        throw new Error("Quiz data is not a valid array or is empty");
      }

      for (let i = 0; i < quizData.length; i++) {
        const q = quizData[i];
        if (!q.question || !q.options || !q.correct_answer) {
          throw new Error(`Question ${i + 1} is missing required fields`);
        }
      }

      console.log("✅ Quiz generated:", quizData.length, "questions");

      return NextResponse.json({ quiz: quizData });
    } catch (e: any) {
      console.error("❌ JSON Parsing Failed:", e.message);

      return NextResponse.json(
        {
          error: "AI returned malformed JSON.",
          parse_error: e.message,
          raw_output: text,
          cleaned_output: cleanedText,
        },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error("❌ Quiz Generation Error:", error);

    // Zod error handler
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input", details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        error: error.message || "Unknown error",
      },
      { status: 500 }
    );
  }
}
