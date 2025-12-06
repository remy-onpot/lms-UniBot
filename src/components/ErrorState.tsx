'use client';

interface ErrorStateProps {
  message: string;
  onRetry?: () => void;
}

export function ErrorState({ message, onRetry }: ErrorStateProps) {
  return (
    <div className="min-h-[60vh] flex items-center justify-center p-6">
      <div className="bg-white p-8 rounded-3xl shadow-xl shadow-slate-200 border border-red-100 text-center max-w-md w-full">
        <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6 text-4xl shadow-inner">
          ⚠️
        </div>
        <h3 className="text-xl font-black text-slate-900 mb-2">Something went wrong</h3>
        <p className="text-slate-500 mb-8 text-sm leading-relaxed font-medium">{message}</p>
        
        <button 
          onClick={() => onRetry ? onRetry() : window.location.reload()} 
          className="w-full py-3.5 bg-red-50 text-red-600 rounded-2xl font-bold text-sm hover:bg-red-100 transition shadow-lg shadow-red-100/50"
        >
          Try Again
        </button>
      </div>
    </div>
  );
}