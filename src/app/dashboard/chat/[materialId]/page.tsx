'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useAIChat } from '@/hooks/useAIChat';
import { ChatWindow } from '@/components/features/chat/ChatWindow';
import { PDFViewer } from '@/components/features/chat/PDFViewer'; 
import { UniBotMascot } from '@/components/ui/UniBotMascot';
import { Button } from '@/components/ui/Button';
import { ArrowLeft, Maximize2, Minimize2, X } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function StudyRoomPage() {
  const params = useParams();
  const router = useRouter();
  const materialId = params?.materialId as string;
  
  const [material, setMaterial] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string>("");
  
  // UI State
  const [isChatOpen, setIsChatOpen] = useState(false); // Mobile Drawer
  const [isDesktopSplit, setIsDesktopSplit] = useState(true); // Desktop Split

  // 1. Fetch Context & Auth
  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
          router.push('/login');
          return;
      }
      setUserId(user.id);

      const { data: mat } = await supabase.from('materials').select('*').eq('id', materialId).single();
      if (mat) setMaterial(mat);
      
      setLoading(false);
    };
    init();
  }, [materialId, router]);

  // 2. Initialize AI (Clean & Secure)
  // We ONLY pass the IDs. The server handles the text.
  const { messages, isLoading: aiLoading, sendMessage, attachments, setAttachments } = useAIChat(
    userId,
    materialId 
  );

  const displayMessages = messages.map(m => ({
    ...m,
    role: (m.role === 'system' ? 'assistant' : m.role) as 'user' | 'assistant'
  }));

  if (loading) return (
    <div className="h-screen w-full flex items-center justify-center bg-slate-50">
        <UniBotMascot size={100} emotion="thinking" action="fly"/>
    </div>
  );

  return (
    <div className="h-screen w-full bg-slate-50 flex flex-col overflow-hidden">
      
      {/* HEADER */}
      <div className="h-14 bg-white border-b flex items-center justify-between px-4 shrink-0 z-20 shadow-sm">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
            <ArrowLeft className="w-5 h-5 text-slate-600" />
          </button>
          <div className="max-w-[200px] md:max-w-md">
             <h1 className="font-bold text-slate-900 text-sm truncate">{material?.title || 'Loading Document...'}</h1>
             <p className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">AI Study Mode</p>
          </div>
        </div>
        
        {/* Desktop Toggle */}
        <div className="hidden md:flex">
           <Button variant="ghost" size="sm" onClick={() => setIsDesktopSplit(!isDesktopSplit)}>
             {isDesktopSplit ? <Maximize2 className="w-4 h-4 mr-2"/> : <Minimize2 className="w-4 h-4 mr-2"/>}
             {isDesktopSplit ? 'Full PDF' : 'Split View'}
           </Button>
        </div>
      </div>

      {/* CONTENT AREA */}
      <div className="flex-1 flex relative overflow-hidden">
        
        {/* 1. PDF VIEWER (Left / Full) */}
        <div className={cn("h-full transition-all duration-300 ease-in-out", isDesktopSplit ? "w-full md:w-1/2 lg:w-[60%]" : "w-full")}>
           {material?.file_url ? (
             <PDFViewer url={material.file_url} />
           ) : (
             <div className="h-full flex items-center justify-center text-slate-400">Document not found</div>
           )}
        </div>

        {/* 2. CHAT PANE (Right Panel) */}
        <div className={cn(
          "hidden md:block h-full border-l bg-white transition-all duration-300 ease-in-out", 
          isDesktopSplit ? "w-1/2 lg:w-[40%]" : "w-0 overflow-hidden opacity-0"
        )}>
           <ChatWindow 
             messages={displayMessages} 
             isLoading={aiLoading} 
             onSendMessage={sendMessage}
             attachments={attachments}
             setAttachments={setAttachments}
           />
        </div>

        {/* 3. MOBILE CHAT DRAWER */}
        <div className="md:hidden absolute bottom-6 right-6 z-50">
           <button 
             onClick={() => setIsChatOpen(true)}
             className="w-14 h-14 bg-slate-900 rounded-full shadow-2xl flex items-center justify-center text-white hover:scale-110 transition-transform active:scale-95 border-2 border-white"
           >
             <UniBotMascot size={30} emotion="happy" action="idle" />
           </button>
        </div>

        <div className={cn(
          "md:hidden absolute inset-x-0 bottom-0 bg-white rounded-t-3xl shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.3)] transition-transform duration-300 z-40 flex flex-col border-t border-slate-200",
          isChatOpen ? "translate-y-0 h-[85vh]" : "translate-y-full h-0"
        )}>
           {/* Handle Bar */}
           <div className="w-full h-6 cursor-pointer bg-transparent flex justify-center pt-3" onClick={() => setIsChatOpen(false)}>
              <div className="w-12 h-1.5 bg-slate-200 rounded-full" />
           </div>
           
           {/* Mobile Header */}
           <div className="px-4 pb-2 border-b flex justify-between items-center">
              <span className="font-bold text-slate-700 text-sm">UniBot Assistant</span>
              <button onClick={() => setIsChatOpen(false)} className="p-2 hover:bg-slate-100 rounded-full"><X className="w-4 h-4"/></button>
           </div>

           <div className="flex-1 overflow-hidden">
             <ChatWindow 
               messages={displayMessages} 
               isLoading={aiLoading} 
               onSendMessage={sendMessage}
               attachments={attachments}
               setAttachments={setAttachments}
             />
           </div>
        </div>

      </div>
    </div>
  );
}