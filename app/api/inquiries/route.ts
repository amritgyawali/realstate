import { NextResponse } from 'next/server';

interface InquiryPayload {
  name?: string;
  email?: string;
  phone?: string;
  message?: string;
  propertySlug?: string;
  propertyTitle?: string;
  agentSlug?: string;
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/**
 * Lead intake.
 *
 * Validates then logs. A deployment would forward the payload to the brokerage
 * CRM or an email service from here; keeping that behind one route means the
 * client never needs credentials and the contract does not change when it lands.
 */
export async function POST(request: Request) {
  let payload: InquiryPayload;
  try {
    payload = (await request.json()) as InquiryPayload;
  } catch {
    return NextResponse.json({ error: 'Malformed request body.' }, { status: 400 });
  }

  const name = payload.name?.trim();
  const email = payload.email?.trim();

  if (!name || name.length < 2) {
    return NextResponse.json({ error: 'A name is required.' }, { status: 422 });
  }
  if (!email || !EMAIL.test(email)) {
    return NextResponse.json({ error: 'A valid email address is required.' }, { status: 422 });
  }
  if (!payload.propertySlug) {
    return NextResponse.json({ error: 'Missing property reference.' }, { status: 422 });
  }

  console.info('[inquiry]', {
    property: payload.propertySlug,
    agent: payload.agentSlug,
    email,
    receivedAt: new Date().toISOString(),
  });

  return NextResponse.json({ ok: true, receivedAt: new Date().toISOString() });
}
