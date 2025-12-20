import { createClient } from '@/lib/supabase/server';

export class TranscriptService {
  
  static async getStudentTranscript(studentId: string) {
    const supabase = await createClient();

    // 1. Get all courses the student has access to via Bundle or Single purchase
    // We can find this by querying the enrollments and then fetching grades
    
    // Fetch Assignments Grades
    const { data: assignments } = await supabase
      .from('assignment_submissions')
      .select(`
        score,
        assignment:assignments(title, total_points, course:courses(title, course_code))
      `)
      .eq('student_id', studentId)
      .eq('status', 'graded');

    // Fetch Quiz Grades
    const { data: quizzes } = await supabase
      .from('quiz_results')
      .select(`
        score,
        total_questions,
        quiz:quizzes(title, course:courses(title, course_code))
      `)
      .eq('student_id', studentId);

    // Aggregate by Course
    const courseGrades: Record<string, { totalScore: number, maxScore: number, title: string, code: string }> = {};

    assignments?.forEach((sub: any) => {
      const courseTitle = sub.assignment?.course?.title || 'Unknown';
      const courseCode = sub.assignment?.course?.course_code || '---';
      
      if (!courseGrades[courseTitle]) {
        courseGrades[courseTitle] = { totalScore: 0, maxScore: 0, title: courseTitle, code: courseCode };
      }
      
      courseGrades[courseTitle].totalScore += (sub.score || 0);
      courseGrades[courseTitle].maxScore += (sub.assignment?.total_points || 100);
    });

    quizzes?.forEach((quiz: any) => {
      const courseTitle = quiz.quiz?.course?.title || 'Unknown';
      const courseCode = quiz.quiz?.course?.course_code || '---';

      if (!courseGrades[courseTitle]) {
        courseGrades[courseTitle] = { totalScore: 0, maxScore: 0, title: courseTitle, code: courseCode };
      }

      // Normalize quiz score to 100 if needed, or simply add
      courseGrades[courseTitle].totalScore += quiz.score; 
      courseGrades[courseTitle].maxScore += 100; // Assuming quizzes are out of 100%
    });

    // Calculate Final Percentages
    const transcript = Object.values(courseGrades).map(c => ({
      courseTitle: c.title,
      courseCode: c.code,
      finalPercentage: c.maxScore > 0 ? Math.round((c.totalScore / c.maxScore) * 100) : 0,
      grade: calculateLetter(c.maxScore > 0 ? (c.totalScore / c.maxScore) * 100 : 0)
    }));

    return transcript;
  }
}

function calculateLetter(percentage: number): string {
  if (percentage >= 80) return 'A';
  if (percentage >= 70) return 'B';
  if (percentage >= 60) return 'C';
  if (percentage >= 50) return 'D';
  return 'F';
}