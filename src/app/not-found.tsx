import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center font-sans">
      
      {/* Abstract Decor */}
      <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-blue-200 rounded-full blur-3xl opacity-20 pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-purple-200 rounded-full blur-3xl opacity-20 pointer-events-none"></div>

      <div className="relative z-10 bg-white p-10 rounded-[2.5rem] shadow-xl max-w-md w-full border border-slate-100">
        <div className="w-24 h-24 bg-slate-100 rounded-3xl flex items-center justify-center mx-auto mb-6 rotate-3 shadow-sm text-5xl">
          🤔
        </div>
        
        <h1 className="text-6xl font-black text-slate-900 mb-2">404</h1>
        <h2 className="text-xl font-bold text-slate-700 mb-4">Page Not Found</h2>
        
        <p className="text-slate-500 mb-8 text-sm">
          We searched everywhere but couldn't find the page you were looking for.
        </p>

        <Link 
          href="/dashboard"
          className="block w-full py-4 bg-indigo-600 text-white rounded-2xl font-bold text-lg hover:bg-indigo-700 transition shadow-xl shadow-indigo-200 transform hover:scale-[1.02] active:scale-95"
        >
          Go Home
        </Link>
      </div>
    </div>
  );
}