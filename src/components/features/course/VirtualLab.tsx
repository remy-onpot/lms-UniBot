'use client';

import { useState, Suspense } from 'react';
import dynamic from 'next/dynamic';
import { 
  Loader2, Maximize2, RefreshCw, X, 
  Cpu, Beaker, Code2, Globe 
} from 'lucide-react';

// ---------------------------------------------------------------------------
// 🚀 SUPER LAZY LOAD STRATEGY
// These imports define CHUNKS. They are NOT downloaded until rendered.
// ---------------------------------------------------------------------------

// 1. The Heavy React Component (Monaco Editor)
const CodeEditorTool = dynamic(
  () => import('./tools/CodeEditor'), 
  { 
    loading: () => <LoadingScreen text="Loading Code Engine..." />,
    ssr: false // Disable Server-Side Rendering for this (it's client-only)
  }
);

// 2. Iframe Wrappers (Lightweight, but we delay setting the 'src')
// We don't need 'dynamic' for iframes, just conditional rendering.

export function VirtualLab() {
  const [activeTool, setActiveTool] = useState<string | null>(null);

  return (
    <div className="space-y-6 animate-in fade-in">
      
      {/* 1. The "App Store" Menu */}
      {!activeTool && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <ToolCard 
            id="circuit"
            title="Circuit Sim" 
            icon={Cpu} 
            color="bg-orange-500" 
            desc="Analog/Digital Circuits"
            onClick={setActiveTool}
          />
          <ToolCard 
            id="molecule"
            title="Molecule Viewer" 
            icon={Beaker} 
            color="bg-purple-500" 
            desc="3D Protein/Chem Structures"
            onClick={setActiveTool}
          />
          <ToolCard 
            id="code"
            title="Python Editor" 
            icon={Code2} 
            color="bg-blue-600" 
            desc="Write & Run Code"
            onClick={setActiveTool}
          />
          <ToolCard 
            id="space"
            title="Sky Atlas" 
            icon={Globe} 
            color="bg-slate-800" 
            desc="Astronomy & Star Map"
            onClick={setActiveTool}
          />
        </div>
      )}

      {/* 2. The Active Workspace */}
      {activeTool && (
        <div className="h-[75vh] w-full bg-slate-900 rounded-2xl overflow-hidden border border-slate-200 relative shadow-2xl flex flex-col">
          
          {/* Workspace Header */}
          <div className="flex items-center justify-between px-4 py-2 bg-slate-800 text-white border-b border-slate-700">
             <span className="font-bold text-sm flex items-center gap-2">
               <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"/> 
               {activeTool.toUpperCase()} LAB
             </span>
             <button 
               onClick={() => setActiveTool(null)}
               className="p-1 hover:bg-slate-700 rounded-lg text-slate-400 hover:text-white transition"
             >
               <X className="w-5 h-5" />
             </button>
          </div>

          {/* Tool Rendering Area */}
          <div className="flex-1 bg-black relative">
            
            {/* TOOL 1: CircuitJS (Iframe) */}
            {activeTool === 'circuit' && (
              <iframe 
                src="https://lushprojects.com/circuitjs/circuitjs.html" 
                className="w-full h-full border-none"
                title="CircuitJS"
              />
            )}

            {/* TOOL 2: Mol* (Iframe) */}
            {activeTool === 'molecule' && (
              <iframe 
                src="https://molstar.org/viewer/?hide-controls=1" 
                className="w-full h-full border-none"
                title="Mol*"
              />
            )}

            {/* TOOL 3: Sky Atlas (Iframe) */}
            {activeTool === 'space' && (
              <iframe 
                src="https://aladin.u-strasbg.fr/AladinLite/" 
                className="w-full h-full border-none"
                title="Aladin"
              />
            )}

            {/* TOOL 4: Code Editor (The Heavy React Component) */}
            {activeTool === 'code' && (
               <CodeEditorTool />
            )}

          </div>
        </div>
      )}
    </div>
  );
}

// --- Subcomponents ---

function ToolCard({ id, title, icon: Icon, color, desc, onClick }: any) {
  return (
    <button 
      onClick={() => onClick(id)}
      className="group relative flex flex-col items-center justify-center p-6 bg-white border border-slate-200 rounded-2xl hover:border-indigo-300 hover:shadow-xl transition-all text-center h-48"
    >
      <div className={`w-14 h-14 rounded-2xl ${color} text-white flex items-center justify-center mb-4 shadow-lg group-hover:scale-110 transition-transform`}>
        <Icon className="w-7 h-7" />
      </div>
      <h4 className="font-bold text-slate-900">{title}</h4>
      <p className="text-xs text-slate-500 mt-1">{desc}</p>
      
      {/* Hover Effect */}
      <div className="absolute inset-0 bg-indigo-500/5 opacity-0 group-hover:opacity-100 rounded-2xl transition-opacity" />
    </button>
  );
}

function LoadingScreen({ text }: { text: string }) {
  return (
    <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 gap-3">
      <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
      <span className="text-sm font-medium">{text}</span>
    </div>
  );
}