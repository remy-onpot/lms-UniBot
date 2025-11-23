import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY || "");

export async function POST(req: Request) {
  try {
    const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "Server configuration error: Missing API Key" }, { status: 500 });
    }

    // 1. Receive Configuration
    const { documentText, topic, difficulty, numQuestions, type } = await req.json();
    
    if (!documentText) {
      return NextResponse.json({ error: "No text provided" }, { status: 400 });
    }

    console.log("📝 Generating quiz with params:", { topic, difficulty, numQuestions, type });

    // 2. Build the prompt with instructions
    const prompt = `You are a strict teacher. Generate a quiz based ONLY on the provided text.

Topic/Chapter Focus: ${topic || "General Review"}
Difficulty Level: ${difficulty || "Medium"}
Number of Questions: ${numQuestions || 5}
Question Type: ${type || "Multiple Choice"}

DOCUMENT TEXT:
${documentText.slice(0, 15000)}

CRITICAL INSTRUCTIONS:
- Generate EXACTLY ${numQuestions || 5} questions
- Questions must be based ONLY on the document text provided above
- You MUST respond with ONLY a valid JSON array, no markdown formatting, no preamble, no explanation
- Do NOT wrap your response in \`\`\`json or \`\`\` code blocks
- Start directly with [ and end with ]

OUTPUT FORMAT (respond with ONLY this structure):
[
  {
    "question": "Question text here?",
    "options": ["Option A", "Option B", "Option C", "Option D"], 
    "correct_answer": "Option A",
    "explanation": "Why this is correct."
  }
]

Now generate the quiz in the exact JSON format specified above:`;

    // 3. Generate Content (Non-Streaming)
    const model = genAI.getGenerativeModel({ 
      model: "gemini-2.5-flash",
    });
    
    console.log("🔄 Calling Gemini API for quiz generation...");
    
    // Use generateContent with the prompt
    const result = await model.generateContent(prompt);
    const text = result.response.text();
    
    console.log("📦 Raw AI response (first 200 chars):", text.substring(0, 200));

    // 4. Clean and Parse JSON
    let cleanedText = text.trim();
    
    // Remove markdown code blocks if present
    cleanedText = cleanedText.replace(/```json\s*/g, '').replace(/```\s*/g, '');
    
    // Remove any text before the first [ and after the last ]
    const firstBracket = cleanedText.indexOf('[');
    const lastBracket = cleanedText.lastIndexOf(']');
    
    if (firstBracket === -1 || lastBracket === -1) {
      console.error("❌ No JSON array found in response");
      return NextResponse.json({ 
        error: "AI did not return valid JSON array.", 
        raw_output: text 
      }, { status: 500 });
    }
    
    cleanedText = cleanedText.substring(firstBracket, lastBracket + 1);
    
    console.log("🧹 Cleaned JSON (first 200 chars):", cleanedText.substring(0, 200));

    try {
      const quizData = JSON.parse(cleanedText);
      
      // Validate structure
      if (!Array.isArray(quizData) || quizData.length === 0) {
        throw new Error("Quiz data is not a valid array or is empty");
      }
      
      // Validate each question has required fields
      for (let i = 0; i < quizData.length; i++) {
        const q = quizData[i];
        if (!q.question || !q.options || !q.correct_answer) {
          throw new Error(`Question ${i + 1} is missing required fields`);
        }
      }
      
      console.log("✅ Quiz generated successfully:", quizData.length, "questions");
      return NextResponse.json({ quiz: quizData });
      
    } catch (e: any) {
      console.error("❌ JSON Parsing Failed:", e.message);
      console.error("Attempted to parse:", cleanedText);
      
      // Return detailed error for debugging
      return NextResponse.json({ 
        error: "AI returned malformed JSON.", 
        parse_error: e.message,
        raw_output: text,
        cleaned_output: cleanedText
      }, { status: 500 });
    }

  } catch (error: any) {
    console.error("❌ Quiz Generation Error:", error);
    return NextResponse.json({ 
      error: error.message || "Unknown error occurred" 
    }, { status: 500 });
  }
}