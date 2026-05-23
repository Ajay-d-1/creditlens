import { NextRequest, NextResponse } from 'next/server';
import Groq from 'groq-sdk';

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

export async function POST(req: NextRequest) {
  try {
    const { findings, totalSavings, tools } = await req.json();
    
    const prompt = `Generate a concise, helpful 100-word summary for a startup founder about their AI tool spend audit.

Audit findings:
${findings.map((f: any) => `- ${f.tool}: ${f.reason} (Save $${Math.round(f.savings)}/mo)`).join('\n')}

Total potential savings: $${Math.round(totalSavings)}/month.

Write in a friendly, actionable tone. Focus on the biggest opportunity and give one specific next step.`;

    const response = await groq.chat.completions.create({
      model: 'llama3-8b-8192',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 150,
    });

    const summary = response.choices[0]?.message?.content || 
      'Based on your audit, you could save significantly by optimizing your AI tool stack.';

    return NextResponse.json({ summary, aiGenerated: true });
    
  } catch (error) {
    return NextResponse.json({ 
      summary: 'Based on your audit, there are opportunities to optimize your AI tool spend. Review the recommendations above and consider switching to more cost-effective plans.',
      aiGenerated: false,
      fallback: true 
    });
  }
}
