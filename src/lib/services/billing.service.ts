import 'server-only';
import { createClient } from '@/lib/supabase/server';
import { AccessType, Transaction } from '@/types';

export class BillingService {
  
  // ==========================================
  // 1. PRICING & CHECKOUT
  // ==========================================

  /**
   * Calculate the total price for a set of courses or a bundle.
   * Required by Server Actions.
   */
  static async calculateCheckoutPrice(type: 'single' | 'bundle', courseIds: string[]) {
    const supabase = await createClient();

    if (type === 'bundle' && courseIds.length > 0) {
      // Logic: For a bundle, we lookup the Class price.
      // We explicitly cast the response because Supabase joins can return arrays
      const { data: course } = await supabase
        .from('courses')
        .select('class_id, classes(access_price)')
        .eq('id', courseIds[0])
        .single();
      
      // Safety check: classes might be returned as an array or object depending on exact relation types
      // The error "Property 'access_price' does not exist on type '{ access_price: any; }[]'" 
      // confirms it is returning an array.
      const classData = Array.isArray(course?.classes) 
        ? course.classes[0] 
        : course?.classes;

      // Force type assertion or optional chaining to satisfy the strict linter
      return (classData as any)?.access_price || 0;
    }

    // Logic: Single course pricing
    // Currently defaulting to 0 as specific course pricing wasn't in the core schema requirements yet
    return 0; 
  }

  // ==========================================
  // 2. PAYMENT PROCESSING (Write)
  // ==========================================

  static async grantAccess(params: {
    userId: string;
    reference: string;
    amount: number;
    accessType: AccessType;
    classId: string;
    courseId?: string; 
  }) {
    const supabase = await createClient();
    
    if (params.accessType === 'single_course' && !params.courseId) {
      throw new Error('Course ID is required for single course purchase');
    }

    const { error: txError } = await supabase
      .from('transactions')
      .insert({
        user_id: params.userId,
        reference: params.reference,
        amount: params.amount,
        status: 'success',
        // 'purpose' column was removed from the strict schema, using metadata or ignoring if strictly typed
        // If your DB still has 'purpose', this is fine. If not, remove this line.
        // Based on the restored schema in previous steps, we are assuming 'purpose' was removed or handled via metadata.
        // However, to satisfy the `DbTransaction` type if it expects it, we keep it consistent with your DB.
        // If the DB strictly removed 'purpose', map this to metadata or remove.
        // Assuming strictly followed schema update:
        // purpose: params.accessType === 'semester_bundle' ? `Bundle Access` : `Course Access` 
      });

    if (txError) {
      // If transactions table requires 'purpose', ensure it exists in DB or add it to insert
      // For now, focusing on the core error:
      throw new Error('Failed to log transaction: ' + txError.message);
    }

    const expiresAt = new Date();
    expiresAt.setMonth(expiresAt.getMonth() + 6); 

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
      throw new Error('Access grant failed: ' + params.reference);
    }

    return { success: true };
  }

  // ==========================================
  // 3. HISTORY & STATUS (Read)
  // ==========================================

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

  static async checkAccessStatus(userId: string, classId: string, courseId?: string) {
    const supabase = await createClient();

    const { data: bundle } = await supabase
      .from('student_course_access')
      .select('id')
      .eq('student_id', userId)
      .eq('class_id', classId)
      .eq('access_type', 'semester_bundle')
      .gt('expires_at', new Date().toISOString())
      .maybeSingle();

    if (bundle) return 'bundle_active';

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