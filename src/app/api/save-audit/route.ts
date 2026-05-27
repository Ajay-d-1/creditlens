import { NextRequest, NextResponse } from 'next/server';
import { generateShareId, saveAudit } from '@/lib/database';

interface SaveAuditRequestBody {
  website?: string;
  email?: string;
  companyName?: string;
  role?: string;
  tools?: Record<string, unknown>[];
  totalSpend?: number;
  totalSavings?: number;
  findings?: Record<string, unknown>[];
  teamSize?: number;
  useCase?: string;
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as SaveAuditRequestBody;

    if (body.website) {
      return NextResponse.json({ error: 'Bot detected' }, { status: 400 });
    }

    if (!body.email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    const shareId = generateShareId();
    const audit = await saveAudit({
      tools_data: body.tools || [],
      total_spend: body.totalSpend || 0,
      total_savings: body.totalSavings || 0,
      findings: body.findings || [],
      email: body.email,
      company_name: body.companyName,
      role: body.role,
      team_size: body.teamSize || 1,
      use_case: body.useCase || 'mixed',
      share_id: shareId,
    });

    return NextResponse.json({ shareId, auditId: audit.id });
  } catch (error) {
    console.error('Audit save failed:', error);
    return NextResponse.json({ error: 'Could not save audit' }, { status: 500 });
  }
}
