import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { plan, type, coupon, seats } = body; 
    
    // ============================================================
    // 🛡️ SECURITY: CALCULATE PRICE IN DATABASE
    // We do NOT calculate price in JS to prevent manipulation.
    // ============================================================
    
    let finalAmount = 0;
    let metadata: any = {};

    if (type === 'subscription') {
        if (plan === 'starter') {
            // Free plan logic bypasses DB calc
            finalAmount = 0;
            metadata = { type: 'subscription', plan_tier: 'starter', seats: 10 }; // Default starter limit
        } else {
            // 1. Call the Secure DB Function
            const { data: pricing, error } = await supabase
                .rpc('calculate_order_price', { 
                    p_seats: seats, 
                    p_coupon_code: coupon || null 
                });

            if (error) throw new Error(error.message);
            if (pricing.error) return NextResponse.json({ error: pricing.error }, { status: 400 });

            // 2. Use the DB-verified Amount
            finalAmount = pricing.final_amount;
            metadata = { type: 'subscription', plan_tier: 'dynamic', seats: seats, coupon_used: coupon };
            
            // 3. Handle 100% Off Coupons (Bypass Payment)
            if (finalAmount <= 0) {
                await handleSuccessfulProvisioning(supabase, user.id, metadata);
                
                // Increment coupon usage if used
                if (coupon) {
                   await supabase.rpc('increment_coupon_usage', { p_code: coupon });
                }
                
                return NextResponse.json({ 
                    status: true, 
                    message: "Coupon covered full amount", 
                    bypass: true 
                });
            }
        }
    } 
    // ... (Keep 'class_unlock' logic here if needed, or move that to DB too)


    // ============================================================
    // 💳 PAYSTACK INITIALIZATION
    // ============================================================
    
    const params = JSON.stringify({
      email: user.email,
      amount: Math.round(finalAmount * 100), // GHS to Pesewas
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

// Helper to update DB after successful "Free" purchase
async function handleSuccessfulProvisioning(supabase: any, userId: string, metadata: any) {
    if (metadata.type === 'subscription') {
        await supabase.from('users').update({ 
            plan_tier: metadata.plan_tier,
            subscription_status: 'active',
            max_students_limit: metadata.seats 
        }).eq('id', userId);
    }
}