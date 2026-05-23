import { NextRequest, NextResponse } from 'next/server';
import { LEAD_MAGNETS } from '@/lib/lead-magnet.config';
import { sendLeadMagnetDirectDownloadEmail } from '@/lib/server/notifications';

interface SubmitBody {
  email: string;
  magnetId: string;
  source: 'popup' | 'banner' | 'section';
  consentNewsletter?: boolean;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as SubmitBody;

    if (!body.email || !EMAIL_REGEX.test(body.email)) {
      return NextResponse.json({ error: 'Nieprawidłowy adres email' }, { status: 400 });
    }

    const magnet = LEAD_MAGNETS.find(m => m.id === body.magnetId);
    if (!magnet) {
      return NextResponse.json({ error: 'Nieznany lead magnet' }, { status: 400 });
    }

    const ip = req.headers.get('x-forwarded-for') ?? 'unknown';
    if (!checkRateLimit(ip)) {
      return NextResponse.json({ error: 'Zbyt wiele prób. Spróbuj za chwilę.' }, { status: 429 });
    }

    await saveSubscriber({
      email: body.email,
      magnetId: body.magnetId,
      source: body.source,
      newsletter: !!body.consentNewsletter,
    });

    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://regulskibehawiorysta.pl';
    const pdfUrl = `${baseUrl}${magnet.pdfPath}`;
    try {
      await sendLeadMagnetDirectDownloadEmail({
        email: body.email,
        title: magnet.title,
        downloadUrl: pdfUrl,
      });
    } catch (emailErr) {
      console.error('[lead-magnet-subscribe] email send failed (non-fatal):', emailErr);
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[lead-magnet-subscribe]', err);
    return NextResponse.json({ error: 'Coś poszło nie tak. Spróbuj ponownie.' }, { status: 500 });
  }
}

async function saveSubscriber(data: {
  email: string;
  magnetId: string;
  source: string;
  newsletter: boolean;
}) {
  if (process.env.MAILERLITE_API_KEY) {
    const groups = [
      process.env.MAILERLITE_GROUP_PDF,
      ...(data.newsletter && process.env.MAILERLITE_GROUP_NEWSLETTER
        ? [process.env.MAILERLITE_GROUP_NEWSLETTER]
        : []),
    ].filter(Boolean);

    const r = await fetch('https://connect.mailerlite.com/api/subscribers', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.MAILERLITE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: data.email,
        groups,
        fields: { magnet_id: data.magnetId, source: data.source },
      }),
    });
    if (!r.ok) {
      const err = await r.text();
      console.error('[mailerlite]', err);
    }
    return;
  }

  // Fallback: log
  console.log('[subscriber]', data);
}

const rateLimits = new Map<string, number[]>();
const MAX_PER_HOUR = 5;
const HOUR_MS = 60 * 60 * 1000;

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const timestamps = (rateLimits.get(ip) ?? []).filter(t => now - t < HOUR_MS);
  if (timestamps.length >= MAX_PER_HOUR) return false;
  timestamps.push(now);
  rateLimits.set(ip, timestamps);
  return true;
}
