import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { AppError, handleAPIError } from "@/lib/error-handler";
import { startOfDay, endOfDay } from "date-fns";

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY || "");

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) throw new AppError("Unauthorized", 401);
    
    const userId = session.user.id;
    const now = new Date();

    // 1. CHECK DB LIMITS (Your new clean table)
    const { count, error: countError } = await supabase
      .from('quiz_history')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('quiz_type', 'daily_quiz')
      .gte('created_at', startOfDay(now).toISOString())
      .lte('created_at', endOfDay(now).toISOString());

    if (countError) throw new AppError("Database connection failed", 500);
    
    const attempts = count || 0;
    if (attempts >= 3) throw new AppError("Daily limit reached", 429);

    // 2. DETERMINE TOPIC
    let promptContext = "";
    let quizTopic = "";

    if (attempts === 0) {
      const { data: profile } = await supabase.from('users').select('interests').eq('id', userId).single();
      const interests = profile?.interests?.join(", ") || "Technology & Business"; 
      quizTopic = "Personal Interests";
      promptContext = `Generate 5 questions based on: ${interests}. Target audience: University Students.`;
    } else if (attempts === 1) {
      quizTopic = "Academic Logic";
      promptContext = "Generate 5 questions testing critical thinking and deductive logic.";
    } else {
      quizTopic = "The Challenge Mix";
      promptContext = "Generate 5 hard questions: 2 Tech Trends, 2 Logic, 1 History.";
    }

    // 3. GENERATE WITH AI (STRICT LITE MODE)
    // ✅ QUOTA FIX: We hardcode 'gemini-2.5-flash-lite' because you have quota for it.
    // We removed the fallback to standard 'flash' because you are rate-limited there.
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-lite" });
    
    const prompt = `${promptContext}
    Return ONLY a JSON array in this exact format (no markdown):
    [
      {
        "question": "Question text?",
        "options": ["Option A", "Option B", "Option C", "Option D"],
        "correct_answer": "A",
        "explanation": "Why correct"
      }
    ]`;

    try {
      const result = await model.generateContent(prompt);
      const text = result.response.text();
      const cleanedText = text.replace(/```json|```/g, "").trim();
      
      const start = cleanedText.indexOf("[");
      const end = cleanedText.lastIndexOf("]");
      
      if (start === -1) throw new Error("Invalid JSON structure");
      
      const rawData = JSON.parse(cleanedText.substring(start, end + 1));

      const formattedQuiz = rawData.map((q: any, idx: number) => ({
          id: `daily-${attempts}-${Date.now()}-${idx}`,
          question: q.question,
          options: q.options,
          answer: ["A","B","C","D"].indexOf(q.correct_answer?.toUpperCase()) || 0,
          explanation: q.explanation
      }));

      return NextResponse.json({ 
        questions: formattedQuiz, 
        topic: quizTopic,
        round: attempts + 1
      });

    } catch (aiError: any) {
      console.error("AI Generation Error:", aiError);
      // Check specifically for Quota Exceeded (429) from Google
      if (aiError.response?.status === 429 || aiError.message?.includes('429')) {
         throw new AppError("Daily AI Quota Exceeded. Try again tomorrow.", 429);
      }
      throw new AppError("AI Service Unavailable.", 503);
    }

  } catch (error) {
    return handleAPIError(error);
  }
}