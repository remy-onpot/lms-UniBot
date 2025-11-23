'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';

export default function QuizGradebookPage() {
  const params = useParams();
  const quizId = params?.quizId as string; // Changed from 'id' to 'quizId'
  const router = useRouter();

  const [quiz, setQuiz] = useState<any>(null);
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<string | null>(null);

  useEffect(() => {
    const fetchGradebook = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return router.push('/login');

      const { data: profile } = await supabase
        .from('users')
        .select('role')
        .eq('id', user.id)
        .single();

      setRole(profile?.role);

      if (profile?.role !== 'lecturer') {
        alert('Access denied. Lecturers only.');
        return router.push('/dashboard');
      }

      // Fetch quiz
      const { data: quizData } = await supabase
        .from('quizzes')
        .select('*')
        .eq('id', quizId)
        .single();

      setQuiz(quizData);

      // Fetch results with student info
      const { data: resultsData } = await supabase
        .from('quiz_results')
        .select(`
          id,
          score,
          submitted_at,
          student_id,
          users (
            email,
            full_name
          )
        `)
        .eq('quiz_id', quizId)
        .order('submitted_at', { ascending: false });

      console.log('📊 Gradebook results:', resultsData);

      if (resultsData) {
        const processedResults = resultsData.map((r: any) => ({
          id: r.id,
          score: r.score,
          submitted_at: r.submitted_at,
          student_name: r.users?.full_name || 'Not provided',
          student_email: r.users?.email || 'N/A'
        }));
        setResults(processedResults);
      }

      setLoading(false);
    };

    fetchGradebook();
  }, [quizId, router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="mx-auto max-w-5xl">
          <div className="text-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading gradebook...</p>
          </div>
        </div>
      </div>
    );
  }

  const averageScore = results.length > 0
    ? Math.round(results.reduce((sum, r) => sum + r.score, 0) / results.length)
    : 0;

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="mx-auto max-w-5xl">
        <button
          onClick={() => router.back()}
          className="mb-6 text-sm text-gray-500 hover:text-gray-900"
        >
          ← Back to Course
        </button>

        <div className="bg-white rounded-xl shadow-sm p-8 mb-6">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-3xl font-bold text-gray-900">{quiz?.title}</h1>
            <span className="px-3 py-1 bg-purple-100 text-purple-700 text-sm font-bold rounded">
              GRADEBOOK
            </span>
          </div>
          <p className="text-gray-600">Topic: {quiz?.topic}</p>

          <div className="mt-6 grid grid-cols-3 gap-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-900 font-bold mb-1">Total Submissions</p>
              <p className="text-3xl font-bold text-blue-700">{results.length}</p>
            </div>
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <p className="text-sm text-green-900 font-bold mb-1">Average Score</p>
              <p className="text-3xl font-bold text-green-700">{averageScore}%</p>
            </div>
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
              <p className="text-sm text-orange-900 font-bold mb-1">Pass Rate</p>
              <p className="text-3xl font-bold text-orange-700">
                {results.length > 0
                  ? Math.round((results.filter(r => r.score >= 70).length / results.length) * 100)
                  : 0}%
              </p>
            </div>
          </div>

          <div className="mt-4">
            <Link
              href={`/dashboard/quiz/${quizId}`}
              className="inline-block px-4 py-2 bg-blue-600 text-white text-sm font-bold rounded hover:bg-blue-700"
            >
              📝 View Quiz Questions & Answers
            </Link>
          </div>
        </div>

        {results.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm p-12 text-center">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-4xl">📊</span>
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">No Submissions Yet</h3>
            <p className="text-gray-600">
              Students haven't taken this quiz yet.
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
              <h2 className="text-lg font-bold text-gray-900">Student Results</h2>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                      Student
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                      Email
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-bold text-gray-700 uppercase tracking-wider">
                      Score
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                      Submitted
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {results.map((result, index) => (
                    <tr key={result.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                            <span className="text-blue-700 font-bold text-sm">{index + 1}</span>
                          </div>
                          <span className="font-medium text-gray-900">{result.student_name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {result.student_email}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <span className={`inline-flex px-3 py-1 text-sm font-bold rounded-full ${
                          result.score >= 70
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {result.score}%
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {new Date(result.submitted_at).toLocaleString('en-US', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}