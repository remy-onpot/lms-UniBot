'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase'; // Auth
import { useParams, useRouter } from 'next/navigation';
import { getRouteParam } from '@/lib/route-utils';
import { QuizService } from '@/lib/services/quiz.service';
import Link from 'next/link';
import { Quiz, QuizResult } from '@/types';

export default function QuizGradebookPage() {
  const params = useParams();
  const router = useRouter();
  const quizId = getRouteParam(params, 'quizId');

  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [results, setResults] = useState<QuizResult[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if(quizId) loadData();
  }, [quizId]);

  const loadData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return router.push('/login');

      // Verify Role
      const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single();
      if (profile?.role !== 'lecturer' && profile?.role !== 'super_admin') {
        alert('Access denied.');
        return router.push('/dashboard');
      }

      const quizData = await QuizService.getById(quizId!);
      setQuiz(quizData);

      const resultsData = await QuizService.getGradebook(quizId!);
      setResults(resultsData || []);

    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="p-20 text-center animate-pulse">Loading Gradebook...</div>;

  const averageScore = results.length > 0
    ? Math.round(results.reduce((sum, r) => sum + r.score, 0) / results.length)
    : 0;

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="mx-auto max-w-5xl">
        <button onClick={() => router.back()} className="mb-6 text-sm text-gray-500 hover:text-gray-900">← Back to Course</button>

        <div className="bg-white rounded-xl shadow-sm p-8 mb-6">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-3xl font-bold text-gray-900">{quiz?.title}</h1>
            <span className="px-3 py-1 bg-purple-100 text-purple-700 text-sm font-bold rounded">GRADEBOOK</span>
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
                {results.length > 0 ? Math.round((results.filter(r => r.score >= 70).length / results.length) * 100) : 0}%
              </p>
            </div>
          </div>

          <div className="mt-4">
            <Link href={`/dashboard/quiz/${quizId}`} className="inline-block px-4 py-2 bg-blue-600 text-white text-sm font-bold rounded hover:bg-blue-700">
              📝 View Questions & Key
            </Link>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-200">
          <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
            <h2 className="text-lg font-bold text-gray-900">Student Results</h2>
          </div>
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 text-gray-500">
              <tr>
                <th className="px-6 py-3">Student</th>
                <th className="px-6 py-3">Email</th>
                <th className="px-6 py-3 text-center">Score</th>
                <th className="px-6 py-3">Submitted</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {results.map((result, index) => (
                <tr key={result.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 font-medium text-gray-900">{result.users?.full_name || 'Unknown'}</td>
                  <td className="px-6 py-4 text-gray-600">{result.users?.email}</td>
                  <td className="px-6 py-4 text-center">
                    <span className={`inline-flex px-3 py-1 text-xs font-bold rounded-full ${result.score >= 70 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                      {result.score}%
                    </span>
                  </td>
                  <td className="px-6 py-4 text-gray-600">{new Date(result.submitted_at).toLocaleString()}</td>
                </tr>
              ))}
              {results.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-gray-400">No submissions yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}