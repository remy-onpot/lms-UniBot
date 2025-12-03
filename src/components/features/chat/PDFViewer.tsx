import React from 'react';

interface PDFViewerProps {
  url: string;
  title: string;
  onBack: () => void;
}

export function PDFViewer({ url, title, onBack }: PDFViewerProps) {
  return (
    <div className="hidden w-1/2 flex-col border-r border-gray-200 bg-white md:flex">
      <div className="flex items-center justify-between border-b border-gray-200 p-4">
        <button 
          onClick={onBack} 
          className="text-sm font-bold text-gray-500 hover:text-gray-900"
        >
          ← Back
        </button>
        <h2 className="truncate font-bold text-gray-800 max-w-xs">{title}</h2>
        <a 
          href={url} 
          target="_blank" 
          rel="noopener noreferrer" 
          className="text-xs font-bold text-blue-600 hover:underline"
        >
          Download
        </a>
      </div>
      <div className="flex-1 bg-gray-100 p-4">
        <iframe 
          src={url} 
          className="h-full w-full rounded-lg border border-gray-300 shadow-sm" 
          title="PDF Viewer" 
        />
      </div>
    </div>
  );
}