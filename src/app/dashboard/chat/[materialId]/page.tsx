'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { ChevronLeft, FileText, Lock, LayoutTemplate } from 'lucide-react';
import { ChatWindow, Message } from '@/components/features/chat/ChatWindow';
import { PDFViewer } from '@/components/features/chat/PDFViewer'; // Assuming this exists
import { CoursePaywallModal } from '@/components/features/student/CoursePaywallModal';
import { Button } from '@/components/ui/Button';
import { Sparkles, Loader2,} from 'lucide-react'; // ✅ Added Loader2
export default function ChatPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  
  const materialId = params?.materialId as string;
  const pageRange = searchParams?.get('pages'); // "5-10"

  const [loading, setLoading] = useState(true);
  const [material, setMaterial] = useState<any>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  
  // View State
  const [showPdfMobile, setShowPdfMobile] = useState(false);

  // Access Control
  const [hasAccess, setHasAccess] = useState(false);
  const [showPaywall, setShowPaywall] = useState(false);
  const [courseContext, setCourseContext] = useState<any>(null); // For paywall modal

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return router.push('/login');

      // 1. Fetch Material & Course Info
      const { data: mat, error } = await supabase
        .from('materials')
        .select(`
           *,
           course:courses (
             id, title, class_id,
             classes ( lecturer_id )
           )
        `)
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

      // 2. Check Permissions
      const isOwner = mat.course.classes.lecturer_id === user.id;
      
      if (isOwner) {
        setHasAccess(true);
      } else {
        // Student Check: Active Access?
        const now = new Date().toISOString();
        const { data: access } = await supabase
          .from('student_course_access')
          .select('id')
          .eq('student_id', user.id)
          .or(`course_id.eq.${mat.course.id},class_id.eq.${mat.course.class_id}`)
          .gt('expires_at', now)
          .maybeSingle();

        // Also allow free weeks (Check Topic Logic if needed, but for simplicity assume Chat is Premium)
        if (access) {
            setHasAccess(true);
        } else {
            setHasAccess(false);
            setShowPaywall(true); // Trigger paywall immediately if trying to access deep content
        }
      }
      
      setLoading(false);
    };

    init();
  }, [materialId, router]);

  const handleSendMessage = async (content: string) => {
    if (!hasAccess) {
      setShowPaywall(true);
      return;
    }

    // Add User Message
    const userMsg: Message = { id: Date.now().toString(), role: 'user', content };
    setMessages(prev => [...prev, userMsg]);
    setIsProcessing(true);

    try {
      // Prepare Context (Text + Page Range)
      // Note: We send the page range to the API so it knows which part of the vector DB to search
      // or we rely on the previously extracted text if small enough.
      
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...messages, userMsg],
          materialId: materialId,
          pageRange: pageRange // "5-10"
        }),
      });

      if (!response.ok) throw new Error("Failed to send message");
      if (!response.body) throw new Error("No response stream");

      // --- STREAMING HANDLER ---
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let aiContent = "";
      const aiMsgId = (Date.now() + 1).toString();

      // Add placeholder AI message
      setMessages(prev => [...prev, { id: aiMsgId, role: 'assistant', content: '', isStreaming: true }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        const chunk = decoder.decode(value, { stream: true });
        aiContent += chunk;

        // Update the last message with new chunk
        setMessages(prev => prev.map(msg => 
          msg.id === aiMsgId ? { ...msg, content: aiContent } : msg
        ));
      }

      // Finish
      setMessages(prev => prev.map(msg => 
          msg.id === aiMsgId ? { ...msg, isStreaming: false } : msg
      ));

    } catch (e) {
      console.error(e);
      toast.error("UniBot encountered an error.");
    } finally {
      setIsProcessing(false);
    }
  };

  if (loading) return (
    <div className="h-screen flex items-center justify-center bg-slate-50">
       <Loader2 className="w-10 h-10 animate-spin text-indigo-600" />
    </div>
  );

  return (
    <div className="h-screen flex flex-col bg-slate-50 overflow-hidden font-sans">
      
      {/* Top Bar */}
      <header className="h-14 bg-white border-b border-slate-200 flex items-center justify-between px-4 shrink-0 z-20">
         <div className="flex items-center gap-3">
            <button onClick={() => router.back()} className="p-2 hover:bg-slate-100 rounded-lg transition">
               <ChevronLeft className="w-5 h-5 text-slate-600" />
            </button>
            <div className="flex items-center gap-2">
               <FileText className="w-4 h-4 text-indigo-600" />
               <h1 className="font-bold text-slate-800 text-sm md:text-base truncate max-w-[200px] md:max-w-md">
                 {material?.title}
               </h1>
               {pageRange && (
                 <span className="text-xs bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded font-bold">
                   Pg {pageRange}
                 </span>
               )}
            </div>
         </div>
         
         {/* Mobile Toggle */}
         <button 
           onClick={() => setShowPdfMobile(!showPdfMobile)}
           className="md:hidden p-2 bg-slate-100 rounded-lg text-slate-600 font-bold text-xs flex items-center gap-2"
         >
           <LayoutTemplate className="w-4 h-4" />
           {showPdfMobile ? 'Show Chat' : 'Show PDF'}
         </button>
      </header>

      {/* Main Workspace */}
      <div className="flex-1 flex overflow-hidden relative">
         
         {/* LEFT: PDF Viewer (Hidden on mobile unless toggled) */}
         <div className={`
            absolute inset-0 md:relative md:w-1/2 lg:w-[55%] bg-slate-100 h-full border-r border-slate-200 transition-transform duration-300 z-10
            ${showPdfMobile ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
         `}>
            {/* If you have a PDFViewer component, use it here. Otherwise, iframe fallback */}
            {hasAccess ? (
               <iframe 
                 src={`${material?.file_url}#toolbar=0`} 
                 className="w-full h-full"
                 title="PDF Document"
               />
            ) : (
               <div className="h-full flex flex-col items-center justify-center bg-slate-100 p-8 text-center">
                  <Lock className="w-16 h-16 text-slate-300 mb-4" />
                  <h3 className="text-xl font-bold text-slate-900">Content Locked</h3>
                  <p className="text-slate-500 mt-2 mb-6">Unlock this course to view the full document.</p>
                  <Button onClick={() => setShowPaywall(true)} className="bg-indigo-600 text-white">
                    Unlock Now
                  </Button>
               </div>
            )}
         </div>

         {/* RIGHT: Chat Window */}
         <div className="w-full md:w-1/2 lg:w-[45%] h-full bg-white relative z-0">
            <ChatWindow 
               messages={messages}
               isLoading={isProcessing}
               onSendMessage={handleSendMessage}
               documentTitle={material?.title}
            />
         </div>
      </div>

      {/* Paywall Modal */}
      {showPaywall && courseContext && (
         <CoursePaywallModal 
            courseName={courseContext.courseName}
            courseId={courseContext.courseId}
            classId={courseContext.classId}
            onClose={() => router.push('/dashboard')} // Kick out if they close without paying
         />
      )}
    </div>
  );
}