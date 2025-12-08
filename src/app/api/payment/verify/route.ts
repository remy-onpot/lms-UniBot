import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js"; // Direct usage for admin
import { BUSINESS_LOGIC } from "@/lib/constants";

export async function POST(req: Request) {
  try {
    const { reference } = await req.json();

    if (!reference) return NextResponse.json({ error: "No reference provided" }, { status: 400 });

    // 1. Verify with Paystack
    const paystackRes = await fetch(`https://api.paystack.co/transaction/verify/${reference}`, {
      headers: {
        Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
      },
    });

    const data = await paystackRes.json();

    if (!data.status || data.data.status !== 'success') {
      return NextResponse.json({ error: "Payment verification failed" }, { status: 400 });
    }

    const { metadata, amount, customer } = data.data;
    const userId = metadata.user_id;

    // 2. Initialize Admin Client (Bypass RLS)
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // 3. Idempotency Check (Don't process twice)
    const { data: existingTx } = await supabaseAdmin
      .from('transactions')
      .select('id')
      .eq('reference', reference)
      .single();

    if (existingTx) {
      return NextResponse.json({ status: true, message: "Already processed" });
    }

    // 4. Log Transaction
    const { error: txError } = await supabaseAdmin.from('transactions').insert({
      user_id: userId,
      reference: reference,
      amount: amount / 100, // Convert Kobo to GHS
      status: 'success',
      purpose: metadata.type,
      metadata: metadata
    });

    if (txError) {
        console.error("TX Error:", txError);
        throw new Error("Failed to log transaction");
    }

    // 5. Grant Access
    const expiryDate = new Date();
    expiryDate.setMonth(expiryDate.getMonth() + 6); // 6 Months Access

    if (metadata.type === 'subscription') {
        // Upgrade Lecturer
        await supabaseAdmin.from('users').update({ 
            plan_tier: metadata.plan_tier, 
            subscription_status: 'active' 
        }).eq('id', userId);
    } 
    else if (metadata.type === 'class_unlock') {
        // Unlock Student Content
        if (metadata.access_type === 'bundle') {
            await supabaseAdmin.from('student_course_access').insert({
                student_id: userId,
                class_id: metadata.class_id,
                access_type: 'semester_bundle',
                amount_paid: amount / 100,
                expires_at: expiryDate.toISOString()
            });
        } else {
            await supabaseAdmin.from('student_course_access').insert({
                student_id: userId,
                course_id: metadata.course_id,
                access_type: 'single_course',
                amount_paid: amount / 100,
                expires_at: expiryDate.toISOString()
            });
        }
    }

    return NextResponse.json({ status: true, success: true });

  } catch (error: any) {
    console.error("Verification Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}