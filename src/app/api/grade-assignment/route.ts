import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY || "");

// Helper function to extract JSON from mixed text
function extractJSON(text: string): any {
  try {
    // 1. Try direct parse first
    return JSON.parse(text);
  } catch (e) {
    // 2. If that fails, try to find the JSON object block
    const firstOpen = text.indexOf('{');
    const lastClose = text.lastIndexOf('}');
    
    if (firstOpen !== -1 && lastClose !== -1) {
      const jsonString = text.substring(firstOpen, lastClose + 1);
      try {
        return JSON.parse(jsonString);
      } catch (innerError) {
        // 3. Last resort: aggressive cleanup of markdown/newlines
        const cleaned = jsonString.replace(/[\n\r]/g, ' ').replace(/\\n/g, '\\n');
        return JSON.parse(cleaned);
      }
    }
    throw new Error("Could not extract valid JSON from response.");
  }
}

export async function POST(req: Request) {
  try {
    const { assignmentTitle, assignmentDescription, studentText, maxPoints } = await req.json();

    // 1. Validate Input
    if (!studentText || studentText.trim().length < 20) {
      return NextResponse.json({
        score: 0,
        is_ai_generated: false,
        feedback: "⚠️ Could not read document text. The file might be a scanned image or empty. Please convert to a text-readable PDF.",
        breakdown: { reasoning: "No text content found." }
      });
    }

    console.log(`📝 Grading: "${assignmentTitle}" | Length: ${studentText.length} chars`);

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
      3. Flag if it seems AI-generated (robotic, repetitive, perfect grammar but shallow).
      
      CRITICAL: Return ONLY valid JSON. No markdown, no conversation.
      
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
        model: "gemini-2.5-flash",
        generationConfig: { responseMimeType: "application/json" }
    });

    const result = await model.generateContent(prompt);
    const responseText = result.response.text();
    
    console.log("🤖 AI Response Preview:", responseText.substring(0, 100));

    try {
        const jsonResponse = extractJSON(responseText);
        return NextResponse.json(jsonResponse);
    } catch (parseError: any) {
        console.error("❌ JSON Parse Error:", parseError);
        console.error("❌ Raw Text was:", responseText);
        
        // Return a fallback so the UI doesn't crash
        return NextResponse.json({
             score: 0,
             is_ai_generated: false,
             feedback: "Error parsing grading results. Please try again.",
             breakdown: { reasoning: "System error: Invalid JSON from AI." }
        });
    }

  } catch (error: any) {
    console.error("❌ AI Grading Error:", error);
    return NextResponse.json({ 
        score: 0, 
        is_ai_generated: false, 
        feedback: "Error processing grading. Please try again.", 
        breakdown: { reasoning: error.message || "AI Service Unavailable" } 
    }, { status: 500 });
  }
}