import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { BUSINESS_LOGIC, PlanType } from "@/lib/constants";

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { plan, type, accessType } = body; 
    // plan = target ID (class_id for bundles, course_id for single)

    // --- 🛡️ SECURITY CHECK ---
    if (type === 'class_unlock') {
       const now = new Date().toISOString();
       
       // 1. Check for Bundle Access (Super Key)
       // If they own the bundle, they own EVERYTHING.
       // We need to find the class_id. If 'plan' is a course, fetch its class.
       let classId = plan;
       if (accessType === 'single_course') {
          const { data: course } = await supabase.from('courses').select('class_id').eq('id', plan).single();
          classId = course?.class_id;
       }

       if (classId) {
          const { data: bundle } = await supabase.from('class_enrollments')
             .select('id')
             .eq('student_id', user.id)
             .eq('class_id', classId)
             .eq('access_type', 'semester_bundle')
             .gt('expires_at', now)
             .maybeSingle();

          if (bundle) return NextResponse.json({ status: true, message: "You have the bundle!", bypass: true });
       }

       // 2. Check for Single Course Access
       if (accessType === 'single_course') {
          const { data: single } = await supabase.from('student_course_access')
             .select('id')
             .eq('student_id', user.id)
             .eq('course_id', plan)
             .gt('expires_at', now)
             .maybeSingle();

          if (single) return NextResponse.json({ status: true, message: "Course already unlocked.", bypass: true });
       }
    }
    // ---------------------------------------------------

    let amount = 0;
    let metadata: any = {};

    // --- PRICE CALCULATION ---
    if (type === 'subscription') {
        const planKey = plan as PlanType;
        const planDetails = BUSINESS_LOGIC.PLANS[planKey];
        if (!planDetails) return NextResponse.json({ error: "Invalid Plan" }, { status: 400 });
        amount = planDetails.price;
        metadata = { type: 'subscription', plan_tier: plan };
    } 
    else if (type === 'class_unlock') {
        const singlePrice = BUSINESS_LOGIC.COHORT.PRICING.SINGLE_COURSE;

        if (accessType === 'bundle') {
           // 'plan' is class_id
           const { count } = await supabase
             .from('courses')
             .select('id', { count: 'exact', head: true })
             .eq('class_id', plan)
             .eq('status', 'active');
           
           const courseCount = count || 1;
           amount = (singlePrice * courseCount) * (1 - BUSINESS_LOGIC.COHORT.PRICING.BUNDLE_DISCOUNT_PERCENT);
           metadata = { type: 'class_unlock', access_type: 'semester_bundle', class_id: plan };
        } else {
           // 'plan' is course_id
           amount = singlePrice;
           // We ALSO need the class_id to ensure they are on the roster
           const { data: c } = await supabase.from('courses').select('class_id').eq('id', plan).single();
           
           metadata = { 
               type: 'class_unlock', 
               access_type: 'single_course', 
               course_id: plan,
               class_id: c?.class_id 
           };
        }
    }

    if (amount <= 0) throw new Error("Invalid calculation.");

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

    // --- DEV SIMULATION (Remove in Prod if not needed) ---
    if (process.env.NODE_ENV === 'development' && process.env.SIMULATE_PAYMENT === 'true') {
        await handleSuccessfulPayment(supabase, user.id, metadata);
        return NextResponse.json({ status: true, message: "Dev Simulation", bypass: true });
    }

    return NextResponse.json({ authorization_url: data.data.authorization_url, reference: data.data.reference });

  } catch (error: any) {
    console.error("Payment Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// ✅ UPDATED: Handles both tables
async function handleSuccessfulPayment(supabase: any, userId: string, metadata: any) {
    const expiryDate = new Date();
    expiryDate.setMonth(expiryDate.getMonth() + 6); // 6 Month Access

    if (metadata.type === 'subscription') {
        await supabase.from('users').update({ 
            plan_tier: metadata.plan_tier,
            subscription_status: 'active'
        }).eq('id', userId);
    } 
    else if (metadata.type === 'class_unlock') {
        
        // 1. Always ensure they are on the Class Roster
        if (metadata.class_id) {
            const enrollmentPayload: any = {
                student_id: userId,
                class_id: metadata.class_id,
                joined_at: new Date().toISOString(),
                has_paid: metadata.access_type === 'semester_bundle' // Only true if they bought the bundle
            };
            
            // Only update access_type if it's a bundle (don't downgrade a bundle owner to single)
            if (metadata.access_type === 'semester_bundle') {
                enrollmentPayload.access_type = 'semester_bundle';
                enrollmentPayload.expires_at = expiryDate.toISOString();
            }

            await supabase.from('class_enrollments').upsert(enrollmentPayload, { onConflict: 'student_id, class_id' });
        }

        // 2. If Single Course, grant specific access
        if (metadata.access_type === 'single_course' && metadata.course_id) {
             await supabase.from('student_course_access').upsert({ 
                 student_id: userId, 
                 course_id: metadata.course_id,
                 expires_at: expiryDate.toISOString()
             }, { onConflict: 'student_id, course_id' });
        }
    }
}