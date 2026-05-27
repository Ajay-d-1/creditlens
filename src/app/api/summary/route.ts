import { NextRequest, NextResponse } from 'next/server';
import Groq from 'groq-sdk';

interface AuditTool {
  name?: string;
  tool?: string;
  plan?: string;
  monthlySpend?: number;
}

interface AuditFinding {
  tool?: string;
  reason?: string;
  savings?: number;
}

interface SummaryRequestBody {
  tools?: AuditTool[];
  toolsList?: string;
  findings?: AuditFinding[];
  totalSpend?: number;
  totalSavings?: number;
  teamSize?: number;
  useCase?: string;
  topRecommendation?: string;
}

const TOOL_NAMES: Record<string, string> = {
  cursor: 'Cursor',
  copilot: 'GitHub Copilot',
  claude: 'Claude',
  chatgpt: 'ChatGPT',
  anthropic_api: 'Anthropic API',
  openai_api: 'OpenAI API',
  gemini: 'Gemini',
  windsurf: 'Windsurf',
};

function money(value: number | undefined): string {
  return Math.round(value || 0).toLocaleString();
}

function formatToolsList(body: SummaryRequestBody): string {
  if (body.toolsList) return body.toolsList;
  if (!body.tools?.length) return 'No tools listed';

  return body.tools
    .map((tool) => {
      const name = tool.name || TOOL_NAMES[tool.tool || ''] || tool.tool || 'Unknown tool';
      const plan = tool.plan ? ` ${tool.plan}` : '';
      const spend = tool.monthlySpend ? ` ($${money(tool.monthlySpend)}/mo)` : '';
      return `${name}${plan}${spend}`;
    })
    .join(', ');
}

function getTopRecommendation(body: SummaryRequestBody): string {
  if (body.topRecommendation) return body.topRecommendation;

  const topFinding = [...(body.findings || [])].sort(
    (a, b) => (b.savings || 0) - (a.savings || 0)
  )[0];

  if (!topFinding) return 'No major savings recommendation found';

  const savings = topFinding.savings ? ` Save $${money(topFinding.savings)}/mo.` : '';
  return `${topFinding.tool || 'Top opportunity'}: ${topFinding.reason || 'Review this recommendation.'}${savings}`;
}

function fallbackSummary(body: SummaryRequestBody): string {
  const toolsList = formatToolsList(body);
  const totalSavings = money(body.totalSavings);
  const topRecommendation = getTopRecommendation(body);

  return `Your CreditLens audit reviewed ${toolsList} and found about $${totalSavings}/mo in potential savings. The biggest opportunity is ${topRecommendation} This week, pick the highest-savings recommendation, confirm the affected seats with your team, and downgrade or cancel that subscription before the next billing cycle.`;
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as SummaryRequestBody;
    const apiKey = process.env.GROQ_API_KEY;

    if (!apiKey) {
      return NextResponse.json({
        summary: fallbackSummary(body),
        aiGenerated: false,
        fallback: true,
        error: 'GROQ_API_KEY is not configured',
      });
    }
    
    const toolsList = formatToolsList(body);
    const totalSpend = money(body.totalSpend);
    const totalSavings = money(body.totalSavings);
    const teamSize = body.teamSize || 'unknown';
    const useCase = body.useCase || 'mixed';
    const topRecommendation = getTopRecommendation(body);

    const prompt = `You are a financial advisor specializing in SaaS cost optimization.
A startup has just completed an AI tool spend audit. Based on their data,
write a 100-word personalized summary paragraph.

Audit data:
- Tools audited: ${toolsList}
- Total monthly spend: $${totalSpend}
- Total potential savings: $${totalSavings}
- Team size: ${teamSize}
- Primary use case: ${useCase}
- Top recommendation: ${topRecommendation}

Write directly to the founder. Be specific about their exact tools and
numbers. Mention the biggest saving opportunity by name. End with one
sentence about what they should do this week. Do not use bullet points.
Do not use generic phrases like "optimize your spend." Be concrete.`;

    const groq = new Groq({ apiKey });

    const response = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 180,
      temperature: 0.4,
    });

    const summary = response.choices[0]?.message?.content?.trim() || fallbackSummary(body);

    return NextResponse.json({ summary, aiGenerated: Boolean(response.choices[0]?.message?.content) });
    
  } catch (error) {
    console.error('Groq summary failed:', error);
    return NextResponse.json({ 
      summary: 'Your CreditLens audit is ready, but the AI summary could not be generated right now. Review the highest-savings recommendation above and make that plan or subscription change this week.',
      aiGenerated: false,
      fallback: true 
    });
  }
}
