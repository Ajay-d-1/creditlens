import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';

interface SendEmailRequestBody {
  email?: string;
  totalSavings?: number;
  toolsList?: string;
  shareId?: string;
}

function formatMoney(value: number): string {
  return `$${Math.round(value || 0).toLocaleString()}`;
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as SendEmailRequestBody;
    const apiKey = process.env.RESEND_API_KEY;

    if (!apiKey) {
      return NextResponse.json({ error: 'RESEND_API_KEY is not configured' }, { status: 500 });
    }

    if (!body.email || !body.shareId) {
      return NextResponse.json({ error: 'Email and shareId are required' }, { status: 400 });
    }

    const totalSavings = Math.round(body.totalSavings || 0);
    const monthlySavings = formatMoney(totalSavings);
    const annualSavings = formatMoney(totalSavings * 12);
    const toolsList = body.toolsList || 'Your AI tools';
    const reportUrl = `https://creditlens-navy.vercel.app/audit/${body.shareId}`;
    const consultationLine = totalSavings > 500
      ? '\n\nOur team at Credex can help you capture these savings through discounted AI credits. Reply to this email to book a consultation.'
      : '';

    const resend = new Resend(apiKey);

    await resend.emails.send({
      from: 'onboarding@resend.dev',
      to: body.email,
      subject: `Your AI Spend Audit — ${monthlySavings}/mo in potential savings found`,
      text: `Hi,

Your CreditLens audit is complete.

Here's what we found:
- Monthly savings opportunity: ${monthlySavings}
- Annual savings opportunity: ${annualSavings}
- Tools audited: ${toolsList}

View your shareable audit report: ${reportUrl}${consultationLine}

— CreditLens by Credex`,
    });

    return NextResponse.json({ sent: true });
  } catch (error) {
    console.error('Confirmation email failed:', error);
    return NextResponse.json({ error: 'Could not send email' }, { status: 500 });
  }
}
