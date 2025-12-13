import Link from 'next/link';
import { UniBotMascot } from '@/components/ui/UniBotMascot'; // ✅ FIXED IMPORT

export default function NotFound() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center font-sans">
      <div className="relative z-10 bg-white p-12 rounded-[2.5rem] shadow-xl max-w-md w-full border border-slate-100">
        
        {/* 🤖 MASCOT: Thinking/Confused */}
        <div className="mx-auto mb-8 flex justify-center">
           <UniBotMascot 
             size={180} 
             emotion="thinking" 
             variant="dashboard"
             className="rotate-12" 
           />
        </div>
        
        <h1 className="text-4xl font-black text-slate-900 mb-2">Wrong Turn?</h1>
        <p className="text-slate-500 mb-8 text-sm leading-relaxed">
          I've searched my entire database (twice!) but I can't find this page. It might have been moved or deleted.
        </p>

        <Link 
          href="/dashboard"
          className="block w-full py-4 bg-indigo-600 text-white rounded-2xl font-bold text-lg hover:bg-indigo-700 transition shadow-xl shadow-indigo-200"
        >
          Take Me Home
        </Link>
      </div>
    </div>
  );
}