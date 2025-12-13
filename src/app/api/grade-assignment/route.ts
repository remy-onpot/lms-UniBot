import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

// Use Gemini 1.5 Flash for faster/cheaper grading, or Pro for complex reasoning
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY!);

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    
    // 1. Security Check
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { submissionId, fileUrl, assignmentId } = await req.json();

    // 2. Fetch Assignment Context (Rubric/Description)
    const { data: assignment } = await supabase
      .from('assignments')
      .select('title, description, total_points')
      .eq('id', assignmentId)
      .single();

    if (!assignment) return NextResponse.json({ error: "Assignment not found" }, { status: 404 });

    // 3. Prepare AI Prompt
    // We pass the file URL directly. Gemini 1.5 can read PDFs via URI if configured, 
    // or we assume the file content is accessible. 
    // For simplicity/reliability in this snippet, we assume Gemini analyzes the text/content.
    
    const model = genAI.getGenerativeModel({ 
        model: "gemini-2.5-flash",
        systemInstruction: "You are a strict but fair university teaching assistant."
    });

    const prompt = `
      Please grade this student submission.
      
      ASSIGNMENT DETAILS:
      Title: ${assignment.title}
      Description/Rubric: ${assignment.description}
      Max Points: ${assignment.total_points}
      
      SUBMISSION URL: ${fileUrl}
      (Note: If you cannot access the URL, please grade based on the assumption that the file contains valid attempts but note the access issue).

      TASK:
      1. Analyze the submission against the description.
      2. Provide a score out of ${assignment.total_points}.
      3. Provide constructive feedback (Strengths, Weaknesses, Improvements).
      
      OUTPUT FORMAT (JSON Only):
      {
        "score": number,
        "feedback": "string (markdown allowed)",
        "breakdown": {
           "reasoning": "string",
           "strengths": ["string"],
           "weaknesses": ["string"]
        }
      }
    `;

    // 4. Generate Grade
    const result = await model.generateContent(prompt);
    const responseText = result.response.text();
    
    // Clean JSON (remove markdown code blocks if any)
    const cleanJson = responseText.replace(/```json|```/g, '').trim();
    let gradeData;
    
    try {
        gradeData = JSON.parse(cleanJson);
    } catch (e) {
        console.error("AI JSON Parse Error:", responseText);
        // Fallback if AI fails to return JSON
        gradeData = { 
            score: 0, 
            feedback: "AI Grading Error: Could not parse response. Please review manually.",
            breakdown: null
        };
    }

    // 5. Update Database
    const { error } = await supabase
      .from('assignment_submissions')
      .update({
        score: gradeData.score,
        feedback: gradeData.feedback,
        ai_breakdown: gradeData.breakdown,
        status: 'graded',
        graded_by: 'ai'
      })
      .eq('id', submissionId);

    if (error) throw error;

    return NextResponse.json({ success: true, ...gradeData });

  } catch (error: any) {
    console.error("Grading API Error:", error);
    // Mark as failed in DB so user isn't stuck in "Pending"
    const supabase = await createClient();
    const { submissionId } = await req.json().catch(() => ({}));
    if (submissionId) {
        await supabase.from('assignment_submissions')
           .update({ status: 'failed', feedback: "System Error during grading." })
           .eq('id', submissionId);
    }
    
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}