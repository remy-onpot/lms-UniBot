import type { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '@/types/database.types';

export class NotificationService {
  
  constructor(private supabase: SupabaseClient<Database>) {}

  /**
   * 1. Saves announcement to DB
   * 2. (Optional) Triggers external broadcast via API
   */
  async broadcastToClass(classId: string, title: string, message: string, lecturerId: string) {
    
    // A. Save to Database
    const { data: announcement, error } = await this.supabase
      .from('class_announcements')
      .insert({
        class_id: classId,
        lecturer_id: lecturerId,
        title,
        message,
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) throw error;

    // B. Fetch Student Count (Simulating the broadcast count)
    const { count } = await this.supabase
      .from('class_enrollments')
      .select('student_id', { count: 'exact', head: true })
      .eq('class_id', classId)
      .eq('status', 'approved');

    // C. (Optional) Call Server API for WhatsApp/Email here
    // await fetch('/api/broadcast', { ... })

    return { 
      success: true, 
      count: count || 0,
      announcement 
    };
  }
}