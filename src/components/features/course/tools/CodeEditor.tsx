'use client';

import { useState } from 'react';
import Editor from '@monaco-editor/react';
import { Loader2, Play } from 'lucide-react';

export default function CodeEditor() {
  const [output, setOutput] = useState("");
  const [code, setCode] = useState("# Write your Python code here\nprint('Hello UniBot!')");

  // Mock execution (In a real app, send 'code' to your backend API to execute)
  const runCode = () => {
    setOutput("Running...\n> Hello UniBot!\n> [Process finished with exit code 0]");
  };

  return (
    <div className="flex flex-col h-full bg-[#1e1e1e] text-white">
      {/* Mini Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 bg-[#252526] border-b border-[#333]">
        <span className="text-xs font-mono text-blue-400">main.py</span>
        <button 
          onClick={runCode}
          className="flex items-center gap-2 px-3 py-1 bg-green-700 hover:bg-green-600 rounded text-xs font-bold transition-colors"
        >
          <Play className="w-3 h-3" /> Run
        </button>
      </div>

      {/* The Heavy Editor */}
      <div className="flex-1 relative">
        <Editor 
          height="100%" 
          defaultLanguage="python" 
          value={code}
          onChange={(val) => setCode(val || "")}
          theme="vs-dark"
          loading={<div className="flex items-center gap-2 p-4 text-slate-400"><Loader2 className="animate-spin" /> Initializing Editor...</div>}
          options={{
            minimap: { enabled: false },
            fontSize: 14,
            padding: { top: 16 }
          }}
        />
      </div>

      {/* Output Console */}
      <div className="h-32 bg-black border-t border-[#333] p-3 font-mono text-xs text-slate-300 overflow-y-auto">
        <pre>{output || "Output will appear here..."}</pre>
      </div>
    </div>
  );
}