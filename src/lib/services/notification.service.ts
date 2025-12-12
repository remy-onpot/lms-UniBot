import { supabase } from '@/lib/supabase';

const TERMII_URL = 'https://api.ng.termii.com/api/sms/send';

export const NotificationService = {
  
  // 📢 The Master Broadcast Function
  async broadcastToClass(classId: string, title: string, message: string) {
    console.log(`🚀 Starting Broadcast: "${title}" to Class ${classId}`);

    // 1. Fetch Recipients (Active Students Only)
    const { data: enrollments } = await supabase
      .from('student_course_access')
      .select('student_id, student:users(phone_number, email)')
      .eq('class_id', classId)
      .gt('expires_at', new Date().toISOString());

    if (!enrollments || enrollments.length === 0) {
      return { count: 0, status: 'no_students' };
    }

    // 2. Extract & Sanitize Phone Numbers
    const phoneNumbers = enrollments
      .map((e: any) => e.student?.phone_number)
      .filter(p => p && p.length > 9); // Basic validation

    // 3. Send via API (Server-Side Logic)
    // We call our internal API route to hide the API Key from the frontend
    const response = await fetch('/api/notifications/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        phones: phoneNumbers,
        message: `[UniBot] ${title}: ${message}`,
      }),
    });

    const result = await response.json();

    // 4. Log to "In-App" Notifications DB (Persistent History)
    const inAppNotifications = enrollments.map((e: any) => ({
      user_id: e.student_id,
      title,
      message,
      type: 'announcement',
      read: false,
      created_at: new Date().toISOString()
    }));

    await supabase.from('notifications').insert(inAppNotifications);

    return { 
      count: phoneNumbers.length, 
      smsStatus: result.status 
    };
  }
};