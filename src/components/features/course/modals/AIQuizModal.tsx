'use client';
import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/Button';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { Sparkles, Save, Loader2, ArrowLeft } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  topic: any;
  courseId: string;
  handoutText?: string;
  onSuccess: () => void;
}

export function AIQuizModal({ isOpen, onClose, topic, courseId, handoutText, onSuccess }: Props) {
  const [step, setStep] = useState(1);
  const [config, setConfig] = useState({ difficulty: 'Medium', count: 5 });
  const [loading, setLoading] = useState(false);
  const [previewQuiz, setPreviewQuiz] = useState<any[]>([]);

  // Step 1: Generate
  const handleGenerate = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/generate-quiz', {
        method: 'POST',
        body: JSON.stringify({
          documentText: handoutText || topic.description || "Topic: " + topic.title,
          topic: topic.title,
          difficulty: config.difficulty,
          numQuestions: config.count
        })
      });
      const data = await res.json();
      setPreviewQuiz(data.quiz);
      setStep(2); 
    } catch (e) {
      toast.error("Generation Failed");
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Save
  const handleSave = async () => {
    setLoading(true);
    try {
      const { data: quizRecord } = await supabase.from('quizzes').insert([{ 
         course_id: courseId, topic_id: topic.id, title: `Quiz: ${topic.title}`, topic: topic.title 
      }]).select().single();

      const questions = previewQuiz.map((q: any) => ({ 
         quiz_id: quizRecord.id, 
         question_text: q.question, 
         options: q.options, 
         correct_answer: q.correct_answer, 
         explanation: q.explanation 
      }));
      
      await supabase.from('questions').insert(questions);
      toast.success("Quiz Saved!");
      onSuccess();
      onClose();
    } catch (e) {
      toast.error("Save Failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg h-[80vh] flex flex-col p-0 gap-0 overflow-hidden">
        <div className="p-6 bg-indigo-600 text-white shrink-0">
          <DialogTitle className="text-xl">AI Quiz Generator</DialogTitle>
          <p className="text-indigo-100 text-sm opacity-90 mt-1">
            {step === 1 ? 'Configure Settings' : 'Review & Approve'}
          </p>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {step === 1 ? (
            <div className="space-y-6">
               <div className="space-y-3">
                 <label className="text-sm font-bold text-slate-700">Difficulty Level</label>
                 <div className="grid grid-cols-3 gap-2">
                    {['Easy', 'Medium', 'Hard'].map(d => (
                      <button 
                        key={d} 
                        onClick={() => setConfig({...config, difficulty: d})} 
                        className={`py-3 rounded-xl text-sm font-bold border transition-all ${config.difficulty === d ? 'bg-indigo-50 border-indigo-500 text-indigo-700 shadow-sm' : 'text-slate-500 hover:bg-slate-50'}`}
                      >
                        {d}
                      </button>
                    ))}
                 </div>
               </div>
               <div className="space-y-3">
                 <label className="text-sm font-bold text-slate-700">Question Count: {config.count}</label>
                 <input 
                   type="range" min="3" max="10" 
                   value={config.count} 
                   onChange={e => setConfig({...config, count: parseInt(e.target.value)})} 
                   className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600" 
                 />
               </div>
            </div>
          ) : (
            <div className="space-y-4">
               {previewQuiz.map((q, i) => (
                 <div key={i} className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                    <p className="font-bold text-sm text-slate-900 mb-3">{i+1}. {q.question}</p>
                    <div className="grid grid-cols-1 gap-2">
                       {q.options.map((opt: string, idx: number) => (
                         <div key={idx} className={`text-xs px-3 py-2 rounded-lg border ${opt === q.correct_answer ? 'bg-green-50 border-green-200 text-green-700 font-bold' : 'bg-white border-slate-100 text-slate-600'}`}>
                           {opt} {opt === q.correct_answer && '✓'}
                         </div>
                       ))}
                    </div>
                 </div>
               ))}
            </div>
          )}
        </div>

        <div className="p-4 border-t bg-slate-50 flex justify-between items-center shrink-0">
          {step === 2 ? (
            <Button variant="ghost" onClick={() => setStep(1)} className="text-slate-500">
              <ArrowLeft className="w-4 h-4 mr-2" /> Back
            </Button>
          ) : (
            <Button variant="ghost" onClick={onClose}>Cancel</Button>
          )}
          
          {step === 1 ? (
            <Button onClick={handleGenerate} disabled={loading} className="bg-indigo-600">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Sparkles className="w-4 h-4 mr-2"/> Generate Preview</>}
            </Button>
          ) : (
            <Button onClick={handleSave} disabled={loading} className="bg-green-600 hover:bg-green-700">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Save className="w-4 h-4 mr-2"/> Approve & Save</>}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}