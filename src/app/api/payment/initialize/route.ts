import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { BUSINESS_LOGIC, PlanType } from "@/lib/constants";

const TEST_COUPON = "UNIBOT-QA-100";

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { plan, type, accessType, coupon } = body; 
    // plan = target ID (course_id or class_id or plan_tier)

    // --- 🛡️ SECURITY CHECK: PREVENT DOUBLE PAYMENT ---
    if (type === 'class_unlock') {
       const now = new Date().toISOString();
       
       // Check if they already own this exact item
       let query = supabase.from('student_course_access')
         .select('id')
         .eq('student_id', user.id)
         .gt('expires_at', now); // Must be active

       if (accessType === 'bundle') {
          // Check for existing Class Bundle
          query = query.eq('class_id', plan);
       } else {
          // Check for Single Course OR Parent Bundle
          // 1. Get class_id of the course to check for bundle ownership
          const { data: courseData } = await supabase
            .from('courses')
            .select('class_id')
            .eq('id', plan)
            .single();

          const classId = courseData?.class_id;

          // Check if they own the specific course OR the class bundle
          if (classId) {
            query = query.or(`course_id.eq.${plan},class_id.eq.${classId}`);
          } else {
            query = query.eq('course_id', plan);
          }
       }

       const { data: existing } = await query.maybeSingle();

       if (existing) {
         // ✅ ALREADY OWNED: Return "Bypass" to simulate success without charging
         return NextResponse.json({ 
           status: true, 
           message: "You already have access.", 
           bypass: true 
         });
       }
    }
    // ---------------------------------------------------

    let amount = 0;
    let metadata: any = {};

    // --- PRICE CALCULATION ---
    if (type === 'subscription') {
        const planDetails = BUSINESS_LOGIC.PLANS[plan as PlanType];
        if (!planDetails) return NextResponse.json({ error: "Invalid Plan" }, { status: 400 });
        amount = planDetails.price;
        metadata = { type: 'subscription', plan_tier: plan };
    } 
    else if (type === 'class_unlock') {
        const singlePrice = BUSINESS_LOGIC.COHORT.pricing.single_course;

        if (accessType === 'bundle') {
           const { count } = await supabase
             .from('courses')
             .select('id', { count: 'exact', head: true })
             .eq('class_id', plan)
             .eq('status', 'active');
           
           const courseCount = count || 0;
           if (courseCount === 0) throw new Error("No courses to bundle.");

           amount = (singlePrice * courseCount) * 0.75; // 25% Discount
           metadata = { type: 'class_unlock', access_type: 'bundle', class_id: plan };
        } else {
           amount = singlePrice;
           metadata = { type: 'class_unlock', access_type: 'single', course_id: plan };
        }
    }

    // --- TEST COUPON BYPASS ---
    if (coupon === TEST_COUPON) {
        await handleSuccessfulPayment(supabase, user.id, metadata, amount);
        return NextResponse.json({ status: true, message: "Test Coupon Applied", bypass: true });
    }

    // --- PAYSTACK INITIALIZATION ---
    const params = JSON.stringify({
      email: user.email,
      amount: Math.round(amount * 100), 
      currency: 'GHS',
      callback_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/payment/callback`, 
      metadata: {
        user_id: user.id,
        ...metadata
      }
    });

    const paystackRes = await fetch('https://api.paystack.co/transaction/initialize', {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
            'Content-Type': 'application/json'
        },
        body: params
    });

    const data = await paystackRes.json();

    if (!data.status) throw new Error(data.message || "Payment init failed");

    return NextResponse.json({ authorization_url: data.data.authorization_url, reference: data.data.reference });

  } catch (error: any) {
    console.error("Payment Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// Internal Helper
async function handleSuccessfulPayment(supabase: any, userId: string, metadata: any, amount: number) {
    const expiryDate = new Date();
    expiryDate.setMonth(expiryDate.getMonth() + 6); 

    if (metadata.type === 'subscription') {
        await supabase.from('users').update({ 
            plan_tier: metadata.plan_tier,
            subscription_status: 'active'
        }).eq('id', userId);
    } 
    else if (metadata.type === 'class_unlock') {
        // Upsert to prevent duplicate key errors if race condition
        const data = {
            student_id: userId,
            amount_paid: amount,
            expires_at: expiryDate.toISOString(),
            access_type: metadata.access_type
        };

        if (metadata.access_type === 'bundle') {
             await supabase.from('student_course_access').upsert({ ...data, class_id: metadata.class_id }, { onConflict: 'student_id, class_id' });
        } else {
             await supabase.from('student_course_access').upsert({ ...data, course_id: metadata.course_id }, { onConflict: 'student_id, course_id' });
        }
    }
}