import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY || "");

export async function POST(req: Request) {
  try {
    const { questions, action, topicId } = await req.json();
    // action: "enhance" or "convert"
    // questions: raw text or parsed questions

    const model = genAI.getGenerativeModel({ 
      model: "gemini-2.5-flash",
    });

    let prompt = '';

    if (action === 'enhance') {
      // AI enhances/rephrases lecturer's questions
      prompt = `You are a quiz improvement assistant. Take these quiz questions and:
1. Rephrase them for clarity and better understanding
2. Improve the options to be more precise
3. Add helpful explanations
4. Keep the same difficulty level

Original questions:
${questions}

Return ONLY a JSON array with this exact structure (no markdown, no code blocks):
[
  {
    "question": "Enhanced question text",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correct_answer": "Option A",
    "explanation": "Why this is correct"
  }
]`;
    } else {
      // Convert raw text/format to quiz JSON
      prompt = `Convert these questions into a standardized quiz format. Extract the questions, options, and correct answers.

Raw input:
${questions}

Return ONLY a JSON array with this exact structure (no markdown, no code blocks):
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
    const text = result.response.text();
    
    // Clean and parse
    let cleanedText = text.trim();
    cleanedText = cleanedText.replace(/```json\s*/g, '').replace(/```\s*/g, '');
    
    const firstBracket = cleanedText.indexOf('[');
    const lastBracket = cleanedText.lastIndexOf(']');
    
    if (firstBracket === -1 || lastBracket === -1) {
      return NextResponse.json({ 
        error: "AI did not return valid JSON", 
        raw_output: text 
      }, { status: 500 });
    }
    
    cleanedText = cleanedText.substring(firstBracket, lastBracket + 1);
    
    const quizData = JSON.parse(cleanedText);
    
    return NextResponse.json({ quiz: quizData });

  } catch (error: any) {
    console.error("Manual questions error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}