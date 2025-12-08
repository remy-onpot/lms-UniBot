import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import crypto from "crypto";

export async function POST(req: Request) {
    const secret = process.env.PAYSTACK_SECRET_KEY || "";
    const body = await req.text();
    const hash = crypto.createHmac('sha512', secret).update(body).digest('hex');

    if (hash !== req.headers.get('x-paystack-signature')) {
        return NextResponse.json({ error: "Invalid Signature" }, { status: 401 });
    }

    const event = JSON.parse(body);

    if (event.event === 'charge.success') {
        const supabase = await createClient(); // Use service role key in production for reliability
        const { metadata, reference, amount } = event.data;
        const userId = metadata.user_id;
        const paidAmount = amount / 100; // Convert back to GHS

        // 1. Log Transaction
        await supabase.from('transactions').insert({
            user_id: userId,
            reference: reference,
            amount: paidAmount,
            status: 'success',
            purpose: metadata.type,
            metadata: metadata
        });

        // 2. Grant Access
        const expiryDate = new Date();
        expiryDate.setMonth(expiryDate.getMonth() + 6);

        if (metadata.type === 'subscription') {
            await supabase.from('users').update({ 
                plan_tier: metadata.plan_tier, 
                subscription_status: 'active' 
            }).eq('id', userId);
        }
        else if (metadata.type === 'class_unlock') {
            if (metadata.access_type === 'bundle') {
                await supabase.from('student_course_access').insert({
                    student_id: userId,
                    class_id: metadata.class_id,
                    access_type: 'semester_bundle',
                    amount_paid: paidAmount,
                    expires_at: expiryDate.toISOString()
                });
            } else {
                await supabase.from('student_course_access').insert({
                    student_id: userId,
                    course_id: metadata.course_id,
                    access_type: 'single_course',
                    amount_paid: paidAmount,
                    expires_at: expiryDate.toISOString()
                });
            }
        }
    }

    return NextResponse.json({ received: true });
}