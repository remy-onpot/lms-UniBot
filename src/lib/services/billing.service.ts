import { supabase } from '../supabase';

export const BillingService = {
  
  // Check if a Lecturer's SaaS subscription is active
  async isLecturerSubscriptionActive(userId: string) {
    const { data } = await supabase
      .from('users')
      .select('subscription_status, subscription_end_date')
      .eq('id', userId)
      .single();
      
    if (!data) return false;
    if (data.subscription_status === 'active') {
       // Check date
       const expiry = new Date(data.subscription_end_date);
       return expiry > new Date(); 
    }
    return false;
  },

  // Check if a Student has access to a specific course
  async checkStudentAccess(studentId: string, courseId: string, classId: string) {
    const { data: access } = await supabase
      .from('student_course_access')
      .select('*')
      .eq('student_id', studentId)
      .or(`course_id.eq.${courseId},class_id.eq.${classId}`) // Check both Single & Bundle
      .maybeSingle();

    if (!access) return { hasAccess: false, type: null };

    // Check Expiry (Standard 6 months)
    const expiry = new Date(access.expires_at);
    if (new Date() > expiry) {
        return { hasAccess: false, type: 'expired' };
    }

    return { 
        hasAccess: true, 
        type: access.access_type // 'single_course' or 'semester_bundle'
    };
  }
};