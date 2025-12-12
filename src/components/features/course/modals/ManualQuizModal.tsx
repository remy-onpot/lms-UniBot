'use client';
import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/Button';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { extractDataFromPDF } from '@/lib/utils/pdf-utils';
import { FileText, Wand2, RefreshCw, Upload, FileType, CheckCircle2, Loader2 } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  topic: any;
  courseId: string;
  onSuccess: () => void;
}

export function ManualQuizModal({ isOpen, onClose, topic, courseId, onSuccess }: Props) {
  const [mode, setMode] = useState<'paste' | 'upload'>('paste');
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [processingType, setProcessingType] = useState<'convert' | 'enhance'>('convert');
  const [fileName, setFileName] = useState('');

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLoading(true);
    try {
      const { fullText } = await extractDataFromPDF(file);
      setContent(fullText);
      setFileName(file.name);
      toast.success("File content extracted!");
    } catch (e) { toast.error("Could not read file"); }
    finally { setLoading(false); }
  };

  const handleSubmit = async () => {
    if (!content) return toast.error("Please provide content");
    setLoading(true);

    try {
      const res = await fetch('/api/process-manual-questions', { 
        method: 'POST', 
        body: JSON.stringify({ questions: content, action: processingType, topicId: topic.id }) 
      });
      
      const { quiz } = await res.json();
      
      const { data: quizRecord } = await supabase.from('quizzes').insert([{ 
         course_id: courseId, topic_id: topic.id, title: `Quiz: ${topic.title}`, topic: topic.title 
      }]).select().single();

      const questions = quiz.map((q: any) => ({ 
         quiz_id: quizRecord.id, 
         question_text: q.question, 
         options: q.options, 
         correct_answer: q.correct_answer, 
         explanation: q.explanation 
      }));
      
      await supabase.from('questions').insert(questions);
      
      toast.success("Quiz Created Successfully!");
      onSuccess();
      onClose();
    } catch (e: any) {
      toast.error("Processing Failed", { description: e.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Create Quiz Manually</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Mode Switcher */}
          <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-lg">
            <button 
              onClick={() => setMode('paste')} 
              className={`py-2 text-sm font-medium rounded-md transition-all ${mode === 'paste' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Paste Text
            </button>
            <button 
              onClick={() => setMode('upload')} 
              className={`py-2 text-sm font-medium rounded-md transition-all ${mode === 'upload' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Upload Document
            </button>
          </div>

          {/* Content Area */}
          <div className="min-h-[200px]">
            {mode === 'paste' ? (
              <Textarea 
                className="h-48 font-mono text-sm"
                placeholder={`1. What is the capital of Ghana?\nA. Accra\nB. Kumasi\nAnswer: A`}
                value={content}
                onChange={e => setContent(e.target.value)}
              />
            ) : (
              <div className="border-2 border-dashed border-slate-200 rounded-xl h-48 flex flex-col items-center justify-center bg-slate-50 relative overflow-hidden group hover:border-indigo-400 transition">
                <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" onChange={handleFile} accept=".pdf,.txt,.docx" />
                {fileName ? (
                  <>
                    <FileType className="w-10 h-10 text-indigo-500 mb-2" />
                    <p className="text-sm font-bold text-slate-700">{fileName}</p>
                    <p className="text-xs text-green-600 flex items-center gap-1 mt-1"><CheckCircle2 className="w-3 h-3"/> Ready to process</p>
                  </>
                ) : (
                  <>
                    <Upload className="w-10 h-10 text-slate-300 mb-2 group-hover:text-indigo-400 transition" />
                    <p className="text-sm font-medium text-slate-600">Drag PDF here or click to browse</p>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Processing Options */}
          <div className="grid grid-cols-2 gap-4">
            <div 
              onClick={() => setProcessingType('convert')}
              className={`p-4 border rounded-xl cursor-pointer transition relative ${processingType === 'convert' ? 'border-indigo-500 bg-indigo-50/50' : 'hover:border-slate-300'}`}
            >
              <div className="flex items-center gap-2 font-bold text-slate-900 mb-1">
                <RefreshCw className="w-4 h-4" /> Direct Convert
              </div>
              <p className="text-xs text-slate-500">Use exact questions. No changes.</p>
              {processingType === 'convert' && <div className="absolute top-2 right-2 w-2 h-2 bg-indigo-500 rounded-full" />}
            </div>

            <div 
              onClick={() => setProcessingType('enhance')}
              className={`p-4 border rounded-xl cursor-pointer transition relative ${processingType === 'enhance' ? 'border-purple-500 bg-purple-50/50' : 'hover:border-slate-300'}`}
            >
              <div className="flex items-center gap-2 font-bold text-purple-900 mb-1">
                <Wand2 className="w-4 h-4" /> AI Enhance
              </div>
              <p className="text-xs text-purple-700/70">Fix errors & add explanations.</p>
              {processingType === 'enhance' && <div className="absolute top-2 right-2 w-2 h-2 bg-purple-500 rounded-full" />}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={loading || !content} className="bg-slate-900">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Create Quiz'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}