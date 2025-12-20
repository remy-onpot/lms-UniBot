import { createClient } from '@/lib/supabase/server';

export class NotificationService {
  
  /**
   * Send a system notification (e.g., "Assignment Graded")
   * Currently just logs, but can be connected to an email provider (Resend) or WhatsApp
   */
  static async sendNotification(userId: string, title: string, message: string, type: 'info' | 'alert' | 'success') {
    // TODO: Integrate Resend or Twilio here
    console.log(`[Notification to ${userId}] ${type.toUpperCase()}: ${title} - ${message}`);
    
    // If you add a 'notifications' table later:
    /*
    const supabase = await createClient();
    await supabase.from('notifications').insert({
      user_id: userId,
      title,
      message,
      type,
      is_read: false
    });
    */
  }

  /**
   * Send class-wide announcement
   */
  static async broadcastToClass(classId: string, title: string, message: string) {
    const supabase = await createClient();

    // 1. Save Announcement to DB
    const { error } = await supabase.from('class_announcements').insert({
      class_id: classId,
      title,
      message,
      created_at: new Date().toISOString()
    });

    if (error) throw error;

    // 2. Fetch all students (for email blast)
    const { data: students } = await supabase
      .from('class_enrollments')
      .select('student_id')
      .eq('class_id', classId)
      .eq('status', 'approved');

    if (students) {
      console.log(`Broadcasting to ${students.length} students in class ${classId}`);
      // Loop and send emails here
    }
  }
}