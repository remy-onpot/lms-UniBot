import Link from 'next/link';

interface NotFoundStateProps {
  title?: string;
  message?: string;
  backLink?: string;
  backText?: string;
}

export function NotFoundState({ 
  title = "Not Found", 
  message = "We couldn't find the content you were looking for.", 
  backLink = "/dashboard", 
  backText = "Back to Dashboard" 
}: NotFoundStateProps) {
  return (
    <div className="min-h-[60vh] flex items-center justify-center p-6">
      <div className="bg-white p-8 rounded-3xl shadow-xl shadow-slate-200 border border-slate-100 text-center max-w-md w-full">
        <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6 text-4xl shadow-inner">
          🔍
        </div>
        <h3 className="text-xl font-black text-slate-900 mb-2">{title}</h3>
        <p className="text-slate-500 mb-8 text-sm leading-relaxed font-medium">{message}</p>
        
        <Link 
          href={backLink}
          className="block w-full py-3.5 bg-slate-900 text-white rounded-2xl font-bold text-sm hover:bg-slate-800 transition shadow-lg shadow-slate-200"
        >
          {backText}
        </Link>
      </div>
    </div>
  );
}