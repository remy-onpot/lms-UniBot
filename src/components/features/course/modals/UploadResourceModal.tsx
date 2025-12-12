'use client';
import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { FileUp, FileText, Loader2 } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  courseId: string;
  onSuccess: () => void;
}

export function UploadResourceModal({ isOpen, onClose, courseId, onSuccess }: Props) {
  const [loading, setLoading] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');

  const handleUpload = async () => {
    if (!file || !title) return toast.error("File and Title required");
    setLoading(true);

    try {
      const path = `${courseId}/supp_${Date.now()}_${file.name}`;
      await supabase.storage.from('course-content').upload(path, file);
      const { data: { publicUrl } } = supabase.storage.from('course-content').getPublicUrl(path);

      await supabase.from('supplementary_materials').insert([{
        course_id: courseId,
        title: title,
        file_url: publicUrl,
        file_type: file.type,
      }]);

      toast.success("Resource Added!");
      onSuccess();
      onClose();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Resource</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* File Picker */}
          <div className="border-2 border-dashed border-slate-200 rounded-xl p-6 text-center hover:bg-slate-50 transition cursor-pointer relative group">
            <input 
              type="file" 
              className="absolute inset-0 opacity-0 cursor-pointer z-10" 
              onChange={e => {
                const f = e.target.files?.[0];
                if (f) { setFile(f); setTitle(f.name.split('.')[0]); }
              }}
            />
            <div className="flex flex-col items-center gap-2">
              <div className="p-3 bg-indigo-50 rounded-full group-hover:bg-indigo-100 transition">
                {file ? <FileText className="w-6 h-6 text-indigo-600" /> : <FileUp className="w-6 h-6 text-indigo-400" />}
              </div>
              <div className="text-sm">
                {file ? (
                  <span className="font-bold text-slate-900">{file.name}</span>
                ) : (
                  <span className="text-slate-500">Click to upload PDF or Image</span>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 uppercase">Resource Title</label>
            <Input 
              value={title} 
              onChange={e => setTitle(e.target.value)}
              placeholder="e.g. Week 4 Slides"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={handleUpload} disabled={loading || !file}>
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save Resource'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}