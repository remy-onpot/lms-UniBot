'use client';
import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { ChevronLeft, Lock, X, Minimize2, Maximize2 } from 'lucide-react';
import { ChatWindow, Message } from '@/components/features/chat/ChatWindow';
import { CoursePaywallModal } from '@/components/features/student/CoursePaywallModal';
import { Button } from '@/components/ui/Button';
import { UniBotLogo } from '@/components/ui/UniBotLogo';

export default function ChatPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  
  const materialId = params?.materialId as string;
  const pageRange = searchParams?.get('pages'); 
  const topicId = searchParams?.get('topicId');

  const [loading, setLoading] = useState(true);
  const [material, setMaterial] = useState<any>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [topicContext, setTopicContext] = useState<any>(null);
  
  // Layout State
  const [isMobileChatOpen, setIsMobileChatOpen] = useState(false);

  // Access Control
  const [hasAccess, setHasAccess] = useState(false);
  const [showPaywall, setShowPaywall] = useState(false);
  const [courseContext, setCourseContext] = useState<any>(null);

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return router.push('/login');

      // 1. Fetch Material & Context
      const { data: mat, error } = await supabase
        .from('materials')
        .select(`*, course:courses(id, title, class_id, classes(lecturer_id))`)
        .eq('id', materialId)
        .single();

      if (error || !mat) {
        toast.error("Material not found");
        return router.push('/dashboard');
      }

      setMaterial(mat);
      setCourseContext({
        courseId: mat.course.id,
        courseName: mat.course.title,
        classId: mat.course.class_id
      });

      // 2. Fetch Topic Context (for AI Persona)
      if (topicId) {
        const { data: topic } = await supabase.from('course_topics').select('title, description').eq('id', topicId).single();
        if (topic) setTopicContext(topic);
      }

      // 3. Fetch Chat History (Scoped to Topic if available)
      let query = supabase
        .from('chat_messages')
        .select('*')
        .eq('material_id', materialId)
        .eq('user_id', user.id)
        .order('created_at', { ascending: true });
        
      if (topicId) {
          query = query.eq('topic_id', topicId); // ✅ SCOPED TO WEEK
      } else {
          query = query.is('topic_id', null); // General document chat
      }

      const { data: history } = await query;

      if (history) {
        setMessages(history.map(h => ({
            id: h.id,
            role: h.role as 'user' | 'assistant',
            content: h.content
        })));
      }

      // 4. Access Logic
      const isOwner = mat.course.classes.lecturer_id === user.id;
      if (isOwner) {
        setHasAccess(true);
      } else {
        const now = new Date().toISOString();
        const { data: access } = await supabase
          .from('student_course_access')
          .select('id')
          .eq('student_id', user.id)
          .or(`course_id.eq.${mat.course.id},class_id.eq.${mat.course.class_id}`)
          .gt('expires_at', now)
          .maybeSingle();

        // Allow access if Purchased OR if it's a "Free Week" (Logic usually handled before entry, but safe fallback)
        // For Chat page specifically, we assume if they got here with a valid Topic ID for week 1/2, it's allowed.
        if (access) setHasAccess(true);
        else {
             // Check Week Number if we have topicId
             if (topicId) {
                 const { data: t } = await supabase.from('course_topics').select('week_number').eq('id', topicId).single();
                 if (t && t.week_number <= 2) {
                     setHasAccess(true); // Allow Free Trial
                 } else {
                     setHasAccess(false);
                     setShowPaywall(true);
                 }
             } else {
                 setHasAccess(false);
                 setShowPaywall(true);
             }
        }
      }
      
      setLoading(false);
    };

    init();
  }, [materialId, topicId, router]);

  const saveMessageToDb = async (role: 'user' | 'assistant', content: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    
    await supabase.from('chat_messages').insert({
        user_id: user.id,
        material_id: materialId,
        topic_id: topicId || null, // ✅ Save Context
        role,
        content
    });
  };

  const handleSendMessage = async (content: string) => {
    if (!hasAccess) return setShowPaywall(true);

    const userMsg: Message = { id: Date.now().toString(), role: 'user', content };
    setMessages(prev => [...prev, userMsg]);
    saveMessageToDb('user', content);
    
    setIsProcessing(true);

    try {
      // ... inside handleSendMessage ...

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...messages, userMsg],
          materialId: materialId,
          pageRange: pageRange || undefined,
          // ✅ CRITICAL: Send topicId so server can verify Week #
          topicId: topicId || undefined, 
          topicContext: topicContext || undefined 
        }),
      });

      if (!response.ok) throw new Error("Failed to send message");
      if (!response.body) throw new Error("No response stream");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let aiContent = "";
      const aiMsgId = (Date.now() + 1).toString();

      setMessages(prev => [...prev, { id: aiMsgId, role: 'assistant', content: '', isStreaming: true }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        aiContent += chunk;
        setMessages(prev => prev.map(msg => msg.id === aiMsgId ? { ...msg, content: aiContent } : msg));
      }

      setMessages(prev => prev.map(msg => msg.id === aiMsgId ? { ...msg, isStreaming: false } : msg));
      saveMessageToDb('assistant', aiContent);

    } catch (e) {
      toast.error("UniBot encountered an error.");
    } finally {
      setIsProcessing(false);
    }
  };

  if (loading) return <div className="h-screen bg-slate-50"></div>;

  return (
    <div className="fixed inset-0 overflow-hidden bg-slate-50 font-sans flex flex-col">
      
      {/* HEADER */}
      <header className="h-14 bg-white border-b border-slate-200 flex items-center justify-between px-4 shrink-0 z-30 shadow-sm">
         <div className="flex items-center gap-3">
            <button onClick={() => router.back()} className="p-2 hover:bg-slate-100 rounded-full transition">
               <ChevronLeft className="w-5 h-5 text-slate-600" />
            </button>
            <div className="flex flex-col">
               <h1 className="font-bold text-slate-800 text-sm truncate max-w-[200px] md:max-w-md">
                 {topicContext?.title || material?.title}
               </h1>
               {pageRange && <span className="text-[10px] text-slate-500">Reading Pages {pageRange}</span>}
            </div>
         </div>
      </header>

      {/* WORKSPACE */}
      <div className="flex-1 flex relative">
         
         {/* PDF VIEWER */}
         <div className="w-full md:w-[55%] h-full bg-slate-200 relative">
            {hasAccess ? (
               <iframe 
                 src={`${material?.file_url}#toolbar=0`} 
                 className="w-full h-full"
                 title="PDF"
               />
            ) : (
               <div className="h-full flex flex-col items-center justify-center p-8 text-center">
                  <Lock className="w-12 h-12 text-slate-400 mb-4" />
                  <p className="text-slate-500 font-medium">Content Locked</p>
                  <Button onClick={() => setShowPaywall(true)} className="mt-4 bg-indigo-600 text-white">Unlock</Button>
               </div>
            )}
         </div>

         {/* CHAT (Responsive Overlay) */}
         <div className={`
            fixed md:relative inset-0 md:inset-auto z-40 md:z-0
            w-full md:w-[45%] h-full bg-white border-l border-slate-200 shadow-2xl md:shadow-none
            transition-transform duration-300 ease-in-out
            ${isMobileChatOpen ? 'translate-y-0' : 'translate-y-full md:translate-y-0'}
         `}>
            {/* Mobile Close Handle */}
            <div className="md:hidden h-10 flex items-center justify-center border-b border-slate-100 bg-slate-50" onClick={() => setIsMobileChatOpen(false)}>
               <div className="w-12 h-1.5 bg-slate-300 rounded-full"></div>
            </div>

            <ChatWindow 
               messages={messages}
               isLoading={isProcessing}
               onSendMessage={handleSendMessage}
               documentTitle={topicContext?.title || material?.title}
            />
         </div>
      </div>

      {/* MOBILE FAB */}
      <div className="md:hidden fixed bottom-6 right-6 z-50">
        <button 
          onClick={() => setIsMobileChatOpen(!isMobileChatOpen)}
          className={`
            w-16 h-16 rounded-full shadow-2xl flex items-center justify-center transition-all duration-300 overflow-hidden
            ${isMobileChatOpen ? 'bg-red-500 rotate-90' : 'bg-white border-4 border-indigo-500'}
          `}
        >
          {isMobileChatOpen ? (
            <X className="w-8 h-8 text-white" />
          ) : (
            <div className="w-full h-full p-2 bg-indigo-50">
               <UniBotLogo state="happy" size="md" /> 
            </div>
          )}
        </button>
      </div>

      {showPaywall && courseContext && (
         <CoursePaywallModal 
            courseName={courseContext.courseName}
            courseId={courseContext.courseId}
            classId={courseContext.classId}
            onClose={() => router.push('/dashboard')} 
         />
      )}
    </div>
  );
}