import { createClient } from '@/lib/supabase/server';
import { AccessType, Transaction } from '@/types';

export class BillingService {
  
  // ==========================================
  // 1. PAYMENT PROCESSING (Write)
  // ==========================================

  /**
   * CORE METHOD: Records a successful payment and grants the user rights to the content.
   * This should be called AFTER the Payment Gateway (Paystack/Stripe) confirms success.
   */
  static async grantAccess(params: {
    userId: string;
    reference: string;
    amount: number;
    accessType: AccessType;
    classId: string;
    courseId?: string; // Optional only if accessType is 'semester_bundle'
  }) {
    const supabase = await createClient();
    
    // A. Validate Bundle Integrity
    if (params.accessType === 'single_course' && !params.courseId) {
      throw new Error('Course ID is required for single course purchase');
    }

    // B. Log the Transaction (Financial Record)
    const { error: txError } = await supabase
      .from('transactions')
      .insert({
        user_id: params.userId,
        reference: params.reference,
        amount: params.amount,
        status: 'success',
        // Helper text to easily see what this transaction was for in DB viewer
        purpose: params.accessType === 'semester_bundle' 
          ? `Bundle Access: ${params.classId}` 
          : `Course Access: ${params.courseId}`
      });

    if (txError) {
      // In a real production app, we might want to alert an admin here because money moved but DB failed
      throw new Error('Failed to log transaction: ' + txError.message);
    }

    // C. Grant Entitlement (The "Keys" to the content)
    const expiresAt = new Date();
    expiresAt.setMonth(expiresAt.getMonth() + 6); // Standard 6-month semester access

    const accessData = {
      student_id: params.userId,
      access_type: params.accessType,
      class_id: params.classId,
      course_id: params.accessType === 'single_course' ? params.courseId : null,
      amount_paid: params.amount,
      payment_reference: params.reference,
      expires_at: expiresAt.toISOString()
    };

    const { error: accessError } = await supabase
      .from('student_course_access')
      .insert(accessData);

    if (accessError) {
      console.error('CRITICAL: Payment succeeded but access grant failed', accessError);
      throw new Error('Access grant failed. Please contact support with ref: ' + params.reference);
    }

    return { success: true };
  }

  // ==========================================
  // 2. HISTORY & STATUS (Read)
  // ==========================================

  /**
   * Get all financial transactions for a user (Student or Lecturer)
   */
  static async getUserTransactions(userId: string) {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data as Transaction[];
  }

  /**
   * Check if a specific course/bundle is active for a student.
   * Useful for the "Buy Now" vs "Open Course" button logic.
   */
  static async checkAccessStatus(userId: string, classId: string, courseId?: string) {
    const supabase = await createClient();

    // Check Bundle first (it overrides everything)
    const { data: bundle } = await supabase
      .from('student_course_access')
      .select('id')
      .eq('student_id', userId)
      .eq('class_id', classId)
      .eq('access_type', 'semester_bundle')
      .gt('expires_at', new Date().toISOString())
      .maybeSingle();

    if (bundle) return 'bundle_active';

    // Check Single Course if ID provided
    if (courseId) {
      const { data: single } = await supabase
        .from('student_course_access')
        .select('id')
        .eq('student_id', userId)
        .eq('course_id', courseId)
        .gt('expires_at', new Date().toISOString())
        .maybeSingle();
      
      if (single) return 'course_active';
    }

    return 'no_access';
  }

  // ==========================================
  // 3. SAAS SUBSCRIPTION (Lecturer Side)
  // ==========================================

  /**
   * For Lecturers: Get their SaaS Plan status (Starter/Pro)
   */
  static async getLecturerSubscription(userId: string) {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('users')
      .select('plan_tier, subscription_status, subscription_end_date')
      .eq('id', userId)
      .single();

    if (error) throw error;

    const isActive = data.subscription_status === 'active' || data.plan_tier === 'free';
    
    return {
      tier: data.plan_tier,
      isActive,
      endsAt: data.subscription_end_date
    };
  }
}