import React from 'react';
import { Quiz, Question } from '@/types';

interface QuizPlayerProps {
  quiz: Quiz;
  questions: Question[];
  answers: { [key: string]: string };
  onAnswer: (questionId: string, option: string) => void;
  onSubmit: () => void;
  onBack: () => void;
}

export function QuizPlayer({ quiz, questions, answers, onAnswer, onSubmit, onBack }: QuizPlayerProps) {
  const isComplete = questions.length > 0 && Object.keys(answers).length === questions.length;

  return (
    <div className="mx-auto max-w-4xl">
      <button onClick={onBack} className="mb-4 text-sm text-gray-500 hover:text-gray-900">← Back</button>

      <div className="bg-white rounded-xl shadow-sm p-8 mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">{quiz.title}</h1>
        <p className="text-gray-600">Topic: {quiz.topic}</p>
        <p className="text-sm text-gray-500 mt-2">Answer all questions and submit when ready</p>
      </div>

      <div className="space-y-6 mb-8">
        {questions.map((q, index) => (
          <div key={q.id} className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="font-bold text-gray-900 mb-4">Question {index + 1}: {q.question_text}</h3>
            <div className="space-y-3">
              {q.options.map((option, i) => (
                <label key={i} className={`flex items-center p-4 rounded-lg border-2 cursor-pointer transition ${answers[q.id] === option ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'}`}>
                  <input 
                    type="radio" 
                    name={`question-${q.id}`} 
                    value={option} 
                    checked={answers[q.id] === option} 
                    onChange={() => onAnswer(q.id, option)} 
                    className="mr-3" 
                  />
                  <span className="text-gray-800">{option}</span>
                </label>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="flex justify-end">
        <button 
          onClick={onSubmit} 
          disabled={!isComplete} 
          className="px-8 py-3 bg-orange-600 text-white rounded-lg font-bold hover:bg-orange-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
        >
          Submit Quiz
        </button>
      </div>
    </div>
  );
}