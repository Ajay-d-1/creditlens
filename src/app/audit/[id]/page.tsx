import { Metadata } from 'next';
import { getAuditByShareId } from '@/lib/database';
import Link from 'next/link';
import { ShareAuditButton } from '@/components/ShareAuditButton';

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  
  try {
    const audit = await getAuditByShareId(id);
    const savings = Math.round(audit.total_savings || 0);
    
    return {
      title: `AI Spend Audit - $${savings}/mo savings found`,
      description: `Audit of AI tool spend. Potential monthly savings: $${savings}.`,
      openGraph: {
        title: 'AI Spend Audit Results',
        description: `Potential monthly savings: $${savings}`,
        type: 'website',
      },
      twitter: {
        card: 'summary_large_image',
        title: `AI Spend Audit - $${savings}/mo savings`,
        description: 'See how much you could save on AI tools.',
      },
    };
  } catch {
    return {
      title: 'AI Spend Audit',
      description: 'Audit your AI tool spend.',
    };
  }
}

export default async function AuditPage({ params }: PageProps) {
  const { id } = await params;
  let audit;
  
  try {
    audit = await getAuditByShareId(id);
  } catch {
    return (
      <main className="min-h-screen bg-slate-900 text-white flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">Audit Not Found</h1>
          <p className="text-slate-400">This audit link may have expired.</p>
        </div>
      </main>
    );
  }

  const findings = audit.findings || [];
  const totalSavings = Math.round(audit.total_savings || 0);
  const totalAnnual = totalSavings * 12;
  const shareUrl = `https://creditlens-navy.vercel.app/audit/${id}`;
  const credexSubject = encodeURIComponent(`CreditLens Audit — $${totalSavings}/mo savings opportunity`);

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
      <div className="max-w-4xl mx-auto px-4 py-12">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2 bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
            CreditLens Audit
          </h1>
          <p className="text-slate-400">Shared audit results</p>
        </div>

        <div className="bg-gradient-to-r from-green-500/20 to-emerald-500/20 rounded-xl p-8 text-center border border-green-500/30 mb-8">
          <p className="text-green-400 text-sm uppercase tracking-wide mb-2">Potential Monthly Savings</p>
          <p className="text-5xl font-bold text-white mb-2">${totalSavings.toLocaleString()}</p>
          <p className="text-slate-400">${totalAnnual.toLocaleString()} / year</p>
        </div>

        {totalSavings > 500 && (
          <div className="mb-8 rounded-xl border border-amber-400/40 bg-amber-500/15 p-5">
            <p className="mb-4 text-amber-100">
              Your team could save ${totalSavings.toLocaleString()}/mo — Credex offers discounted AI credits that capture these savings directly.
            </p>
            <a
              href={`mailto:hello@credex.rocks?subject=${credexSubject}`}
              className="inline-block rounded-lg bg-amber-300 px-5 py-3 font-semibold text-slate-950 transition-colors hover:bg-amber-200"
            >
              Book a Credex Consultation →
            </a>
          </div>
        )}

        <div className="mb-8 rounded-xl border border-slate-700 bg-slate-800/50 p-5">
          <p className="mb-3 text-sm text-slate-400">Shareable URL</p>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <p className="min-w-0 flex-1 break-all rounded-lg border border-slate-700 bg-slate-900/70 px-4 py-3 text-sm text-slate-300">
              {shareUrl}
            </p>
            <ShareAuditButton url={shareUrl} />
          </div>
        </div>

        {findings.length > 0 ? (
          <div className="space-y-4">
            <h3 className="text-xl font-semibold text-white">Recommendations</h3>
            {findings.map((finding: { tool: string; severity: string; reason: string; currentPlan: string; recommendedPlan: string; savings: number }, index: number) => (
              <div 
                key={index} 
                className={`rounded-lg p-4 border ${
                  finding.severity === 'high' 
                    ? 'bg-red-500/10 border-red-500/30' 
                    : finding.severity === 'medium'
                    ? 'bg-yellow-500/10 border-yellow-500/30'
                    : 'bg-blue-500/10 border-blue-500/30'
                }`}
              >
                <div className="flex justify-between items-start mb-2">
                  <h4 className="font-semibold text-white">{finding.tool}</h4>
                  <span className={`text-xs px-2 py-1 rounded ${
                    finding.severity === 'high' 
                      ? 'bg-red-500/20 text-red-400' 
                      : finding.severity === 'medium'
                      ? 'bg-yellow-500/20 text-yellow-400'
                      : 'bg-blue-500/20 text-blue-400'
                  }`}>
                    {finding.severity?.toUpperCase()}
                  </span>
                </div>
                <p className="text-slate-300 text-sm mb-2">{finding.reason}</p>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">{finding.currentPlan} → {finding.recommendedPlan}</span>
                  <span className="text-green-400 font-semibold">Save ${Math.round(finding.savings)}/mo</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-green-500/10 rounded-xl p-6 text-center border border-green-500/30">
            <p className="text-green-400 text-lg font-semibold">Well optimized!</p>
          </div>
        )}

        <p className="mt-8 text-center text-sm text-slate-500">
          Audited by CreditLens · creditlens-navy.vercel.app
        </p>

        <div className="mt-8 text-center">
          <Link 
            href="/" 
            className="inline-block bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-semibold px-8 py-3 rounded-xl"
          >
            Audit Your Own Stack →
          </Link>
        </div>
      </div>
    </main>
  );
}
