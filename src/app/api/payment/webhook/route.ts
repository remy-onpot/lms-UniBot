import { NextResponse } from "next/server";
import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";
import { env } from "@/lib/env";

// Initialize Admin Client (Bypass RLS)
// ⚠️ NEVER export this client to the browser
const supabaseAdmin = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

export async function POST(req: Request) {
  try {
    // 1. 🛡️ Validate Paystack Signature
    // Paystack sends a hash in the header. We must match it.
    const signature = req.headers.get("x-paystack-signature");
    if (!signature) {
      return NextResponse.json({ error: "No signature" }, { status: 401 });
    }

    const body = await req.json(); // Use raw body if possible for strict crypto, but json works often
    // Re-stringify for hashing (Paystack requires the raw JSON string)
    const rawBody = JSON.stringify(body);
    
    const hash = crypto
      .createHmac("sha512", env.PAYSTACK_SECRET_KEY)
      .update(rawBody)
      .digest("hex");

    if (hash !== signature) {
      console.error("🔴 Potential Fraud: Invalid Webhook Signature");
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    // 2. Handle the Event
    const event = body.event;
    const data = body.data;

    if (event === "charge.success") {
      const { reference, metadata, amount, currency } = data;
      const userId = metadata?.user_id;

      if (!userId) {
        console.error(`⚠️ Payment ${reference} missing user_id in metadata`);
        return NextResponse.json({ status: "ignored" });
      }

      // 3. Idempotency: Check if we already processed this ref
      const { data: existingTx } = await supabaseAdmin
        .from('transactions')
        .select('id')
        .eq('reference', reference)
        .maybeSingle();

      if (existingTx) {
        return NextResponse.json({ status: "already_processed" });
      }

      // 4. Log Transaction (Source of Truth)
      const { error: txError } = await supabaseAdmin.from('transactions').insert({
        user_id: userId,
        reference: reference,
        amount: amount / 100, // Paystack is in Kobo (cents)
        status: 'success',
        purpose: metadata.type || 'unknown',
        metadata: metadata,
        currency: currency
      });

      if (txError) {
        console.error("🔴 DB Write Error:", txError);
        return NextResponse.json({ error: "DB Error" }, { status: 500 });
      }

      // 5. Grant Access / Upgrade Plan logic
      await grantUserAccess(userId, metadata, amount / 100);

      console.log(`✅ Webhook processed: ${reference} for User ${userId}`);
    }

    return NextResponse.json({ status: "success" });

  } catch (error: any) {
    console.error("Webhook Handler Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

/**
 * 🏗️ Shared Business Logic for Granting Access
 */
async function grantUserAccess(userId: string, metadata: any, amountPaid: number) {
  const expiryDate = new Date();
  expiryDate.setMonth(expiryDate.getMonth() + 6); // 6 Month Access

  if (metadata.type === 'subscription') {
    // Upgrade Lecturer Plan
    await supabaseAdmin.from('users').update({ 
      plan_tier: metadata.plan_tier, 
      subscription_status: 'active',
      subscription_end_date: expiryDate.toISOString() 
    }).eq('id', userId);
    
  } else if (metadata.type === 'class_unlock') {
    // Unlock Student Content
    const accessData = {
      student_id: userId,
      amount_paid: amountPaid,
      expires_at: expiryDate.toISOString(),
      access_type: metadata.access_type,
      // Handle conditional insertion
      ...(metadata.access_type === 'bundle' 
          ? { class_id: metadata.class_id } 
          : { course_id: metadata.course_id })
    };

    await supabaseAdmin.from('student_course_access').insert(accessData);
  }
}