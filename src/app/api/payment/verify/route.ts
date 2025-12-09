import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { BUSINESS_LOGIC } from "@/lib/constants";

// Initialize Admin Client (Bypass RLS)
// We do this OUTSIDE the handler if possible, but inside is safer for serverless cold starts to pick up env vars
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

export async function POST(req: Request) {
  try {
    // 1. Env Check
    if (!process.env.PAYSTACK_SECRET_KEY) {
      console.error("❌ CRITICAL: Missing PAYSTACK_SECRET_KEY");
      return NextResponse.json({ error: "Server Configuration Error" }, { status: 500 });
    }

    const { reference } = await req.json();

    if (!reference) {
      return NextResponse.json({ error: "No transaction reference provided" }, { status: 400 });
    }

    // 2. Idempotency Check (Don't process twice)
    // We check our DB first to save a Paystack API call
    const { data: existingTx } = await supabaseAdmin
      .from('transactions')
      .select('id')
      .eq('reference', reference)
      .maybeSingle();

    if (existingTx) {
      console.log(`ℹ️ Transaction ${reference} already processed.`);
      return NextResponse.json({ status: true, message: "Transaction already recorded" });
    }

    // 3. Verify with Paystack (The Source of Truth)
    const paystackRes = await fetch(`https://api.paystack.co/transaction/verify/${reference}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
      },
    });

    const data = await paystackRes.json();

    if (!data.status || data.data.status !== 'success') {
      console.warn(`⚠️ Payment verification failed for ref: ${reference}`);
      return NextResponse.json({ error: "Payment verification failed or pending" }, { status: 400 });
    }

    const { metadata, amount, customer } = data.data;
    const userId = metadata.user_id;

    if (!userId) {
        return NextResponse.json({ error: "Transaction metadata missing user_id" }, { status: 400 });
    }

    // 4. Log Transaction (Audit Trail)
    // We log it FIRST so we have a record even if the permission update fails logic-wise
    const { error: txError } = await supabaseAdmin.from('transactions').insert({
      user_id: userId,
      reference: reference,
      amount: amount / 100, // Convert Kobo to GHS
      status: 'success',
      purpose: metadata.type || 'unknown',
      metadata: metadata,
      currency: data.data.currency
    });

    if (txError) {
        console.error("🔴 DB Write Error (Transaction):", txError);
        throw new Error("Failed to record transaction in database");
    }

    // 5. Grant Access / Upgrade Plan
    const expiryDate = new Date();
    expiryDate.setMonth(expiryDate.getMonth() + 6); // Standard Semester Access

    if (metadata.type === 'subscription') {
        // Upgrade Lecturer
        const { error: updateError } = await supabaseAdmin.from('users').update({ 
            plan_tier: metadata.plan_tier, 
            subscription_status: 'active',
            subscription_end_date: expiryDate.toISOString() // Set expiry for SaaS too
        }).eq('id', userId);

        if (updateError) throw updateError;
        
    } else if (metadata.type === 'class_unlock') {
        // Unlock Student Content
        const accessData = {
            student_id: userId,
            amount_paid: amount / 100,
            expires_at: expiryDate.toISOString(),
            access_type: metadata.access_type
        };

        if (metadata.access_type === 'bundle') {
             // Unlock by Class ID
             const { error: accessError } = await supabaseAdmin.from('student_course_access').insert({
                ...accessData,
                class_id: metadata.class_id
             });
             if (accessError) throw accessError;

        } else {
             // Unlock by Course ID
             const { error: accessError } = await supabaseAdmin.from('student_course_access').insert({
                ...accessData,
                course_id: metadata.course_id
             });
             if (accessError) throw accessError;
        }
    }

    console.log(`✅ Payment verified & access granted for user ${userId}`);
    return NextResponse.json({ status: true, success: true });

  } catch (error: any) {
    console.error("🔴 VERIFICATION ROUTE CRITICAL ERROR:", error);
    return NextResponse.json({ 
      error: error.message || "Internal Processing Error",
      details: "Check server logs"
    }, { status: 500 });
  }
}