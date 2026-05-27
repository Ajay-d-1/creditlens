import { createClient, type PostgrestError } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';

interface SaveAuditRequestBody {
  b_address?: string;
  email?: string;
  companyName?: string;
  role?: string;
  teamSize?: number;
  useCase?: string;
  tools?: Record<string, unknown>[];
  toolsData?: Record<string, unknown>[] | string;
  totalSpend?: number;
  totalSavings?: number;
  findings?: Record<string, unknown>[] | string;
}

function logSupabaseError(error: PostgrestError) {
  console.error('Supabase error details:', {
    message: error.message,
    code: error.code,
    details: error.details,
    hint: error.hint,
  });
}

function shouldRetryWithStringifiedJson(error: PostgrestError) {
  const combined = `${error.message} ${error.details} ${error.hint}`.toLowerCase();
  return combined.includes('tools_data') || combined.includes('findings') || combined.includes('json');
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as SaveAuditRequestBody;

    const honeypotValue = body.b_address;
    if (honeypotValue && honeypotValue.trim().length > 0) {
      return NextResponse.json({ error: 'Bot detected' }, { status: 400 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      console.error('Supabase env vars missing:', {
        hasUrl: Boolean(supabaseUrl),
        hasAnonKey: Boolean(supabaseKey),
      });

      return NextResponse.json(
        { error: 'Database is not configured' },
        { status: 500 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    const shareId = uuidv4();
    const toolsData = body.toolsData ?? body.tools ?? [];
    const findings = body.findings ?? [];

    const insertData = {
      share_id: shareId,
      email: body.email || null,
      company_name: body.companyName || null,
      role: body.role || null,
      team_size: body.teamSize || null,
      use_case: body.useCase || null,
      tools_data: toolsData,
      total_spend: body.totalSpend || 0,
      total_savings: body.totalSavings || 0,
      findings,
    };

    let { data, error } = await supabase
      .from('audits')
      .insert(insertData)
      .select('share_id')
      .single();

    if (error && shouldRetryWithStringifiedJson(error)) {
      logSupabaseError(error);

      const retryResult = await supabase
        .from('audits')
        .insert({
          ...insertData,
          tools_data: typeof toolsData === 'string' ? toolsData : JSON.stringify(toolsData),
          findings: typeof findings === 'string' ? findings : JSON.stringify(findings),
        })
        .select('share_id')
        .single();

      data = retryResult.data;
      error = retryResult.error;
    }

    if (error) {
      console.error('Supabase insert error:', error);
      logSupabaseError(error);

      return NextResponse.json(
        { error: 'Database error', details: error.message },
        { status: 500 }
      );
    }

    if (!data?.share_id) {
      console.error('Supabase insert returned no share_id');
      return NextResponse.json(
        { error: 'Database error', details: 'No share_id returned' },
        { status: 500 }
      );
    }

    try {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || req.nextUrl.origin;

      await fetch(`${appUrl}/api/send-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: body.email,
          totalSavings: body.totalSavings,
          totalSpend: body.totalSpend,
          shareId: data.share_id,
          toolsData,
        }),
      });
    } catch (emailError) {
      console.error('Email send failed (non-fatal):', emailError);
    }

    return NextResponse.json({ shareId: data.share_id });
  } catch (err) {
    console.error('Save audit unexpected error:', err);
    return NextResponse.json(
      { error: 'Unexpected error' },
      { status: 500 }
    );
  }
}
