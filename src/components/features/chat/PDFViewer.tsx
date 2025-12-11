import React from 'react';
import { FileText, ExternalLink, Download } from 'lucide-react';

interface PDFViewerProps {
  url: string;
  title: string;
  onBack: () => void;
}

export function PDFViewer({ url, title, onBack }: PDFViewerProps) {
  return (
    <div className="w-full md:w-1/2 flex flex-col border-r border-slate-200 bg-slate-50/50 md:bg-white h-[200px] md:h-auto shrink-0 md:shrink">
      
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-200 p-4 bg-white">
        <button 
          onClick={onBack} 
          className="text-xs font-bold text-slate-500 hover:text-slate-900 flex items-center gap-1 transition-colors"
        >
          ← Back
        </button>
        <h2 className="truncate font-bold text-slate-800 text-sm max-w-[150px] md:max-w-xs">{title}</h2>
        <a 
          href={url} 
          download
          className="text-slate-400 hover:text-indigo-600 transition-colors"
          title="Download PDF"
        >
          <Download className="w-4 h-4" />
        </a>
      </div>

      {/* Content Area */}
      <div className="flex-1 p-4 overflow-hidden relative">
        
        {/* DESKTOP: Iframe (Embedded Viewer) */}
        <iframe 
          src={`${url}#toolbar=0`} 
          className="hidden md:block h-full w-full rounded-xl border border-slate-200 shadow-sm bg-white" 
          title="PDF Viewer" 
        />

        {/* MOBILE: Native Fallback Card */}
        <div className="md:hidden h-full flex flex-col items-center justify-center bg-white rounded-xl border border-slate-200 p-6 text-center shadow-sm">
           <div className="w-12 h-12 bg-red-50 rounded-full flex items-center justify-center mb-3">
              <FileText className="w-6 h-6 text-red-500" />
           </div>
           <p className="text-sm font-bold text-slate-900 mb-1">PDF Document</p>
           <p className="text-xs text-slate-500 mb-4 max-w-[200px] truncate">{title}</p>
           
           <a 
             href={url}
             target="_blank"
             rel="noopener noreferrer"
             className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 text-white text-xs font-bold rounded-lg active:scale-95 transition-transform shadow-lg shadow-slate-200"
           >
             Open in Viewer <ExternalLink className="w-3 h-3" />
           </a>
        </div>

      </div>
    </div>
  );
}