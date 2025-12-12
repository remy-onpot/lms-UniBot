// src/app/api/payment/webhook/route.ts
import { NextResponse } from "next/server";
import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";
import { env } from "@/lib/env";

// Initialize Admin Client (Bypass RLS)
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
    const signature = req.headers.get("x-paystack-signature");
    if (!signature) {
      return NextResponse.json({ error: "No signature" }, { status: 401 });
    }

    // Must clone the request to read body twice (once for verification, once for processing)
    const rawBody = await req.text(); 
    const body = JSON.parse(rawBody);
    
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
 * 🏆 REFACTORED: Shared Business Logic for Granting Access.
 * Now targets the unified 'class_enrollments' table for student access.
 */
async function grantUserAccess(userId: string, metadata: any, amountPaid: number) {
  const expiryDate = new Date();
  expiryDate.setMonth(expiryDate.getMonth() + 6); // 6 Month Access
  const classId = metadata.class_id;

  if (metadata.type === 'subscription') {
    // Upgrade Lecturer Plan
    await supabaseAdmin.from('users').update({ 
      plan_tier: metadata.plan_tier, 
      subscription_status: 'active',
      subscription_end_date: expiryDate.toISOString() 
    }).eq('id', userId);
    
  } else if (metadata.type === 'class_unlock') {
    // Unlock Student Content (B2C Model)
    if (!classId) {
        throw new Error("Missing class_id for class_unlock payment.");
    }
    
    // 1. Check if enrollment record exists first (student must use class code first)
    const { data: existingEnrollment } = await supabaseAdmin
        .from('class_enrollments')
        .select('id')
        .eq('student_id', userId)
        .eq('class_id', classId)
        .maybeSingle();

    if (!existingEnrollment) {
        // If they paid but haven't joined, create the enrollment record with payment info
        await supabaseAdmin.from('class_enrollments').insert({
            student_id: userId,
            class_id: classId,
            has_paid: true,
            access_type: metadata.access_type,
            expires_at: expiryDate.toISOString(),
        });
    } else {
        // 2. Update the existing enrollment record to activate payment
        await supabaseAdmin.from('class_enrollments')
            .update({
                has_paid: true,
                access_type: metadata.access_type,
                expires_at: expiryDate.toISOString(),
            })
            .eq('id', existingEnrollment.id);
    }
  }
}