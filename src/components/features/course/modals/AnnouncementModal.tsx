'use client';
import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/Button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { NotificationService } from '@/lib/services/notification.service';
import { toast } from 'sonner';
import { Megaphone, Send, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  classId: string;
  lecturerId: string;
}

export function AnnouncementModal({ isOpen, onClose, classId, lecturerId }: Props) {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ title: '', message: '' });

  const handleSend = async () => {
    if (!form.title || !form.message) return toast.error("Please fill all fields");
    setLoading(true);
    
    try {
      // 1. Save to DB
      const { error } = await supabase.from('class_announcements').insert([{ 
        class_id: classId, 
        lecturer_id: lecturerId, 
        title: form.title, 
        message: form.message 
      }]);
      if (error) throw error;

      // 2. Broadcast
      // Don't await this if it takes too long, let it run in background
      NotificationService.broadcastToClass(classId, form.title, form.message)
        .then(res => toast.success(`Sent to ${res.count} students via WhatsApp`))
        .catch(console.error);
      
      toast.success("Announcement Posted!");
      onClose();
      setForm({ title: '', message: '' });
    } catch (e: any) {
      toast.error("Failed to send", { description: e.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="mx-auto bg-indigo-100 p-3 rounded-full mb-2 w-fit">
            <Megaphone className="w-6 h-6 text-indigo-600" />
          </div>
          <DialogTitle className="text-center">New Announcement</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <label className="text-sm font-medium leading-none">Title</label>
            <Input 
              placeholder="e.g. Exam Schedule Change"
              value={form.title}
              onChange={e => setForm({...form, title: e.target.value})}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium leading-none">Message</label>
            <Textarea 
              placeholder="Type your message here..."
              value={form.message}
              onChange={e => setForm({...form, message: e.target.value})}
              className="min-h-[100px]"
            />
          </div>
        </div>

        <DialogFooter className="sm:justify-between">
          <Button variant="secondary" onClick={onClose} className="w-full sm:w-auto">Cancel</Button>
          <Button onClick={handleSend} disabled={loading} className="w-full sm:w-auto bg-indigo-600">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
            Post Now
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}