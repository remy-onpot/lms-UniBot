import React from 'react';
import { useRouter } from 'next/navigation';

interface QuizResultViewProps {
  score: number;
  hasAccess: boolean;
  courseId: string;
  onUnlock: () => void;
}

export function QuizResultView({ score, hasAccess, courseId, onUnlock }: QuizResultViewProps) {
  const router = useRouter();

  if (!hasAccess) {
    return (
      <div className="mx-auto max-w-2xl">
        <div className="bg-white rounded-xl shadow-lg p-8 text-center border border-orange-200">
          <div className="w-20 h-20 bg-orange-50 rounded-full flex items-center justify-center mx-auto mb-6">
            <span className="text-4xl">🔒</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Quiz Submitted!</h1>
          <p className="text-gray-500 mb-6">Your answers have been recorded.</p>
          
          <div className="bg-gray-50 p-6 rounded-xl mb-6 relative overflow-hidden group cursor-pointer" onClick={onUnlock}>
            <div className="filter blur-sm select-none opacity-50">
              <p className="text-sm text-gray-400 font-bold mb-2">Your Score</p>
              <p className="text-4xl font-bold text-gray-800">85%</p>
            </div>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="bg-white/90 p-4 rounded-lg shadow-lg text-center transform transition hover:scale-105">
                <p className="font-bold text-gray-800 mb-2 text-sm">Score Hidden</p>
                <button className="px-6 py-2 bg-blue-600 text-white text-sm font-bold rounded-lg hover:bg-blue-700 shadow-lg">
                  Unlock Results (₵15)
                </button>
              </div>
            </div>
          </div>
          
          <button onClick={() => router.push(`/dashboard/courses/${courseId}`)} className="text-gray-500 text-sm hover:text-gray-800 font-medium">
            ← Back to Course
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl">
      <div className="bg-white rounded-xl shadow-lg p-8 text-center">
        <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 ${score >= 70 ? 'bg-green-100' : 'bg-red-100'}`}>
          <span className="text-4xl">{score >= 70 ? '🎉' : '📚'}</span>
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Quiz Complete!</h1>
        <p className="text-gray-600 mb-6">{score >= 70 ? 'Great job!' : 'Keep studying!'}</p>
        <div className={`border rounded-lg p-6 mb-6 ${score >= 70 ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
          <p className={`text-sm font-bold mb-2 ${score >= 70 ? 'text-green-900' : 'text-red-900'}`}>Your Score</p>
          <p className={`text-4xl font-bold ${score >= 70 ? 'text-green-700' : 'text-red-700'}`}>{score}%</p>
        </div>
        <button onClick={() => router.push(`/dashboard/courses/${courseId}`)} className="px-6 py-3 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700">
          Back to Course
        </button>
      </div>
    </div>
  );
}