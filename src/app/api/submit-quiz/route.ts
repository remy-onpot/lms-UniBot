import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { quizId, answers } = await req.json();

    // 1. Fetch Correct Answers (Server-Side Only)
    const { data: questions } = await supabase
      .from('questions')
      .select('id, correct_answer')
      .eq('quiz_id', quizId);

    if (!questions || questions.length === 0) {
        return NextResponse.json({ error: "Quiz has no questions" }, { status: 400 });
    }

    // 2. Calculate Score
    let correctCount = 0;
    questions.forEach((q) => {
      const studentAnswer = answers[q.id];
      if (studentAnswer && studentAnswer === q.correct_answer) {
        correctCount++;
      }
    });

    const totalQuestions = questions.length;
    const score = Math.round((correctCount / totalQuestions) * 100);

    // 3. Save Result to DB
    const { data: result, error } = await supabase
      .from('quiz_results')
      .insert({
        quiz_id: quizId,
        student_id: user.id,
        score: score,
        total_questions: totalQuestions,
        correct_answers: correctCount,
        submitted_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ 
        success: true, 
        score, 
        correctCount, 
        totalQuestions,
        resultId: result.id 
    });

  } catch (error: any) {
    console.error("Quiz Submit Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}