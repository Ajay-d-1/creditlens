import { NextRequest, NextResponse } from 'next/server';
import { getProvider } from '@/app/api/llm/provider';
import type { AuditResult } from '@/engine/types';

export async function POST(req: NextRequest) {
  try {
    const audit: AuditResult = await req.json();
    if (!audit || !Array.isArray(audit.findings)) {
      return NextResponse.json(
        { error: 'Invalid AuditResult payload' },
        { status: 400 }
      );
    }

    const provider = getProvider();
    const markdown = await provider.phraseFindings(audit);

    return NextResponse.json({ markdown });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error during phrasing';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
