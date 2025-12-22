'use client';

import React from 'react';

// ✅ FIX 1: Define strict types so TypeScript knows 'options' is a string array
interface Question {
  id: string;
  question_text: string;
  options: string[];
  correct_answer: string;
  explanation?: string;
}

interface Quiz {
  title: string;
  topic: string;
}

interface QuizLecturerViewProps {
  quiz: Quiz;
  questions: Question[];
  onBack: () => void;
}

export function QuizLecturerView({ quiz, questions, onBack }: QuizLecturerViewProps) {
  return (
    <div className="mx-auto max-w-4xl animate-in fade-in">
      <button onClick={onBack} className="mb-4 text-sm text-gray-500 hover:text-gray-900 font-medium">
        ← Back to Course
      </button>

      {/* Header Card */}
      <div className="bg-white rounded-xl shadow-sm p-8 mb-6 border border-gray-100">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-3xl font-bold text-gray-900">{quiz.title}</h1>
          <span className="px-3 py-1 bg-purple-100 text-purple-700 text-xs font-bold rounded">
            LECTURER VIEW
          </span>
        </div>
        <p className="text-gray-600">Topic: {quiz.topic}</p>
        <p className="text-sm text-gray-500 mt-2">Total Questions: {questions.length}</p>
      </div>

      {/* Questions List */}
      <div className="space-y-6">
        {questions.map((q, index) => (
          <div key={q.id || index} className="bg-white rounded-lg shadow-sm p-6 border-l-4 border-blue-500">
            <h3 className="font-bold text-gray-900 mb-4">
              Question {index + 1}: {q.question_text}
            </h3>
            
            <div className="space-y-3 mb-4">
              {/* ✅ FIX 2: Explicitly type 'option' string to solve the build error */}
              {q.options?.map((option: string, i: number) => {
                const isCorrect = option === q.correct_answer;
                
                return (
                  <div 
                    key={i} 
                    className={`p-3 rounded-lg border-2 ${
                      isCorrect ? 'border-green-500 bg-green-50' : 'border-gray-200 bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-gray-800">{option}</span>
                      {isCorrect && (
                        <span className="text-green-600 font-bold text-sm">✓ CORRECT</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Explanation Box */}
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