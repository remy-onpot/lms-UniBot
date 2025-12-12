import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { phones, message } = await req.json();
    const apiKey = process.env.TERMII_API_KEY;
    const senderId = process.env.TERMII_SENDER_ID || 'UniBot';

    if (!phones || phones.length === 0) return NextResponse.json({ status: 'skipped' });

    // 🛑 DEV MODE: Don't waste money testing
    if (process.env.NODE_ENV === 'development') {
      console.log('🔔 [DEV SMS MOCK]:', { phones, message });
      return NextResponse.json({ status: 'simulated', count: phones.length });
    }

    // 🟢 PROD MODE: Send via Termii
    const payload = {
      to: phones,
      from: senderId,
      sms: message,
      type: "plain",
      channel: "generic",
      api_key: apiKey,
    };

    const res = await fetch('https://api.ng.termii.com/api/sms/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    return NextResponse.json(data);

  } catch (error) {
    return NextResponse.json({ error: 'Failed to send SMS' }, { status: 500 });
  }
}