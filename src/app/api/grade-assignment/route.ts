import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY || "");

export async function POST(req: Request) {
  try {
    // 1. Accept 'maxPoints' from the frontend
    const { assignmentTitle, assignmentDescription, studentText, maxPoints } = await req.json();

    const prompt = `
      You are a strict university professor. Grade this student submission.
      
      ASSIGNMENT: "${assignmentTitle}"
      INSTRUCTIONS: "${assignmentDescription}"
      MAX POSSIBLE SCORE: ${maxPoints} points
      
      STUDENT SUBMISSION:
      "${studentText ? studentText.slice(0, 25000) : ''}"
      
      TASK:
      1. Analyze the submission for relevance, accuracy, and depth.
      2. **Calculated Score**: Assign a score between 0 and ${maxPoints}. DO NOT grade out of 100 unless max points is 100.
      3. **AI Detection**: Estimate if this text is likely AI-generated.
      4. **Feedback**: Provide detailed feedback justifying the score.
      
      OUTPUT JSON FORMAT ONLY:
      {
        "score": 0,
        "is_ai_generated": false,
        "feedback": "General summary...",
        "breakdown": {
           "reasoning": "Explanation of the score...",
           "strengths": ["Point 1"],
           "weaknesses": ["Point 1"]
        }
      }
    `;

    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    const result = await model.generateContent(prompt);
    const responseText = result.response.text().replace(/```json|```/g, '').trim();
    
    return NextResponse.json(JSON.parse(responseText));

  } catch (error: any) {
    console.error("AI Grading Error:", error);
    return NextResponse.json({ 
        score: 0, 
        is_ai_generated: false, 
        feedback: "Error processing grading.", 
        breakdown: { reasoning: "AI Service Unavailable" } 
    });
  }
}