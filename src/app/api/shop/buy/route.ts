import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { AppError, handleAPIError } from "@/lib/error-handler";
import { checkRateLimit } from "@/lib/rate-limit";
import { z } from "zod";

const purchaseSchema = z.object({
  itemId: z.string().uuid(),
});

export async function POST(req: Request) {
  try {
    // 1. Auth & Rate Limit Check
    const supabase = await createClient();
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) throw new AppError("Unauthorized", 401);

    const isAllowed = await checkRateLimit(session.user.id, 'grading'); // Reuse existing limit or create 'commerce' limit
    if (!isAllowed) throw new AppError("Too many transactions. Please wait.", 429);

    // 2. Validate Input
    const body = await req.json();
    const { itemId } = purchaseSchema.parse(body);

    // 3. Call the Atomic RPC
    const { data, error } = await supabase.rpc('purchase_shop_item', {
      item_id_input: itemId
    });

    if (error) {
      // Pass the specific error message from Postgres (e.g. "Insufficient gems")
      throw new AppError(error.message, 400);
    }

    return NextResponse.json(data);

  } catch (error) {
    return handleAPIError(error);
  }
}