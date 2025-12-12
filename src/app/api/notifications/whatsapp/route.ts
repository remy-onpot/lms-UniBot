import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { phones, message } = await req.json();

    // 🚧 FUTURE INTEGRATION: Termii or Meta Cloud API
    // For now, we simulate the success to test the UI flow.
    console.log(`[WhatsApp Mock] Sending to ${phones.length} numbers:`, message);

    /* // Example: Termii Implementation
    const response = await fetch('https://api.ng.termii.com/api/sms/send', {
      method: 'POST',
      body: JSON.stringify({
        to: phones,
        from: "UniBot",
        sms: message,
        type: "plain",
        channel: "whatsapp",
        api_key: process.env.TERMII_KEY
      })
    });
    */

    return NextResponse.json({ success: true, count: phones.length });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}