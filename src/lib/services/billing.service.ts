import { createClient } from "@/lib/supabase/server";
import { COHORT_RULES } from "@/lib/constants";

export const BillingService = {
  
  async getStudentAccessStatus(studentId: string, courseId: string, classId: string) {
    const supabase = await createClient();
    const now = new Date().toISOString();

    // 1. CHECK BUNDLE (Super Access)
    const { data: bundle } = await supabase
      .from('class_enrollments')
      .select('expires_at')
      .eq('student_id', studentId)
      .eq('class_id', classId)
      .eq('access_type', 'semester_bundle') 
      .gt('expires_at', now)
      .maybeSingle();

    if (bundle) {
        return { has_paid_course: true, has_paid_bundle: true, expires_at: bundle.expires_at };
    }

    // 2. CHECK SINGLE COURSE (Granular Access)
    const { data: single } = await supabase
      .from('student_course_access')
      .select('expires_at')
      .eq('student_id', studentId)
      .eq('course_id', courseId) // Check specific course
      .gt('expires_at', now)
      .maybeSingle();

    if (single) {
        return { has_paid_course: true, has_paid_bundle: false, expires_at: single.expires_at };
    }

    // 3. NO ACCESS
    return { has_paid_course: false, has_paid_bundle: false, expires_at: null };
  },

  async calculateCheckoutPrice(itemType: 'single' | 'bundle', courseIds?: string[]) {
    if (itemType === 'single') {
        return COHORT_RULES.PRICING.SINGLE_COURSE;
    }

    if (itemType === 'bundle' && courseIds && courseIds.length > 0) {
        const rawTotal = courseIds.length * COHORT_RULES.PRICING.SINGLE_COURSE;
        const discountAmount = rawTotal * COHORT_RULES.PRICING.BUNDLE_DISCOUNT_PERCENT;
        return Math.max(0, parseFloat((rawTotal - discountAmount).toFixed(2))); 
    }
    
    return 0;
  },

  async isLecturerSubscriptionActive(userId: string) {
      const supabase = await createClient();
      const { data } = await supabase
        .from('users')
        .select('subscription_status, subscription_end_date')
        .eq('id', userId)
        .single();
        
      if (!data) return false;
      if (data.subscription_status === 'active') {
         return new Date(data.subscription_end_date!) > new Date(); 
      }
      return false;
  }
};