'use client'; // Error components must be Client Components

import { useEffect } from 'react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Ideally log this to a service like Sentry
    console.error('Global Error:', error);
  }, [error]);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center font-sans">
      <div className="bg-white p-10 rounded-[2.5rem] shadow-2xl max-w-md w-full border border-red-100">
        <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6 text-4xl shadow-inner">
          💥
        </div>
        
        <h1 className="text-3xl font-black text-slate-900 mb-2">
          Something went wrong
        </h1>
        
        <p className="text-slate-500 mb-8 text-sm leading-relaxed">
          {error.message || "An unexpected error occurred."}
        </p>

        <div className="flex flex-col gap-3">
          <button
            onClick={reset}
            className="w-full py-3.5 bg-red-600 text-white rounded-2xl font-bold hover:bg-red-700 transition shadow-lg shadow-red-200"
          >
            Try Again
          </button>
          
          <a
            href="/dashboard"
            className="w-full py-3.5 bg-slate-100 text-slate-600 rounded-2xl font-bold hover:bg-slate-200 transition"
          >
            Go to Dashboard
          </a>
        </div>
      </div>
    </div>
  );
}