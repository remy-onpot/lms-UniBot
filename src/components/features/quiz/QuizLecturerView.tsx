import React from 'react';
import { Quiz, Question } from '@/types';

interface QuizLecturerViewProps {
  quiz: Quiz;
  questions: Question[];
  onBack: () => void;
}

export function QuizLecturerView({ quiz, questions, onBack }: QuizLecturerViewProps) {
  return (
    <div className="mx-auto max-w-4xl">
      <button onClick={onBack} className="mb-4 text-sm text-gray-500 hover:text-gray-900">← Back</button>

      <div className="bg-white rounded-xl shadow-sm p-8 mb-6">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-3xl font-bold text-gray-900">{quiz.title}</h1>
          <span className="px-3 py-1 bg-purple-100 text-purple-700 text-xs font-bold rounded">LECTURER VIEW</span>
        </div>
        <p className="text-gray-600">Topic: {quiz.topic}</p>
        <p className="text-sm text-gray-500 mt-2">Total Questions: {questions.length}</p>
      </div>

      <div className="space-y-6">
        {questions.map((q, index) => (
          <div key={q.id} className="bg-white rounded-lg shadow-sm p-6 border-l-4 border-blue-500">
            <h3 className="font-bold text-gray-900 mb-4">Question {index + 1}: {q.question_text}</h3>
            <div className="space-y-3 mb-4">
              {q.options.map((option, i) => (
                <div key={i} className={`p-3 rounded-lg border-2 ${option === q.correct_answer ? 'border-green-500 bg-green-50' : 'border-gray-200 bg-gray-50'}`}>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-800">{option}</span>
                    {option === q.correct_answer && <span className="text-green-600 font-bold text-sm">✓ CORRECT</span>}
                  </div>
                </div>
              ))}
            </div>
            {q.explanation && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-xs font-bold text-blue-900 mb-1">EXPLANATION:</p>
                <p className="text-sm text-blue-800">{q.explanation}</p>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}