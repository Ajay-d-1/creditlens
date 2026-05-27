import type { Metadata } from 'next';
import Link from 'next/link';
import { ShareAuditButton } from '@/components/ShareAuditButton';
import { getAuditByShareId } from '@/lib/database';

interface PageProps {
  params: Promise<{ id: string }>;
}

interface SharedFinding {
  tool: string;
  severity?: string;
  reason: string;
  currentPlan: string;
  recommendedPlan: string;
  savings: number;
}

function parseFindings(findings: unknown): SharedFinding[] {
  if (typeof findings === 'string') {
    try {
      return JSON.parse(findings) as SharedFinding[];
    } catch {
      return [];
    }
  }

  return Array.isArray(findings) ? findings as SharedFinding[] : [];
}

function getPriority(finding: SharedFinding): 'HIGH' | 'MEDIUM' | 'LOW' {
  if (finding.severity === 'high') return 'HIGH';
  if (finding.severity === 'medium') return 'MEDIUM';
  return 'LOW';
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
      <main className="flex min-h-screen items-center justify-center bg-[#0f172a] text-white">
        <div className="text-center">
          <h1 className="mb-2 text-2xl font-bold">Audit Not Found</h1>
          <p className="text-slate-400">This audit link may have expired.</p>
        </div>
      </main>
    );
  }

  const findings = parseFindings(audit.findings);
  const totalSavings = Math.round(audit.total_savings || 0);
  const totalAnnual = totalSavings * 12;
  const shareUrl = `https://creditlens-navy.vercel.app/audit/${id}`;

  return (
    <main className="min-h-screen bg-[#0f172a] pb-20">
      <div className="mx-auto max-w-6xl px-4 pt-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-white">CreditLens Audit</h1>
          <p className="text-sm text-slate-400">Shared audit results</p>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_340px]">
          <div className="space-y-4">
            <div className="rounded-xl bg-green-500 p-8 text-center">
              <p className="mb-2 text-xs font-bold uppercase tracking-widest text-green-900">
                Potential Monthly Savings
              </p>
              <p className="mb-2 text-5xl font-black text-white lg:text-7xl">
                ${totalSavings.toLocaleString()}
              </p>
              <p className="font-medium text-green-900">
                ${totalAnnual.toLocaleString()} / year
              </p>
            </div>

            {totalSavings > 500 && (
              <div className="flex flex-col gap-4 rounded-xl bg-amber-500 p-5 md:flex-row md:items-center md:justify-between">
                <p className="font-medium text-amber-950">
                  Your team could save ${totalSavings.toLocaleString()}/mo — Credex offers discounted AI credits that capture these savings directly.
                </p>
                <a
                  href={`mailto:hello@credex.rocks?subject=${encodeURIComponent(`CreditLens Audit — $${totalSavings}/mo savings opportunity`)}`}
                  className="shrink-0 whitespace-nowrap rounded-lg bg-amber-950 px-4 py-2 text-sm font-medium text-amber-100 transition-colors hover:bg-amber-900"
                >
                  Book a Credex Consultation →
                </a>
              </div>
            )}

            <div className="border-t border-[#334155]" />

            <h3 className="text-lg font-semibold text-white">Recommendations</h3>
            {findings.length > 0 ? (
              <div className="space-y-3">
                {findings.map((finding) => {
                  const priority = getPriority(finding);

                  return (
                    <div
                      key={`${finding.tool}-${finding.currentPlan}-${finding.recommendedPlan}`}
                      className="rounded-xl border border-[#334155] bg-[#1e293b] p-5"
                    >
                      <div className="mb-2 flex items-start justify-between gap-4">
                        <div className="flex items-center gap-3">
                          <span className="font-semibold text-white">{finding.tool}</span>
                          <span className={`rounded px-2 py-0.5 text-xs font-bold ${
                            priority === 'HIGH'
                              ? 'bg-red-500/20 text-red-400'
                              : priority === 'MEDIUM'
                                ? 'bg-amber-500/20 text-amber-400'
                                : 'bg-green-500/20 text-green-400'
                          }`}
                          >
                            {priority}
                          </span>
                        </div>
                        <span className="shrink-0 font-bold text-green-400">
                          Save ${Math.round(finding.savings)}/mo
                        </span>
                      </div>
                      <p className="mb-3 text-sm text-slate-400">{finding.reason}</p>
                      <div className="flex items-center justify-between gap-3">
                        <span className="font-mono text-xs text-slate-500">
                          {finding.currentPlan} → {finding.recommendedPlan}
                        </span>
                        <button
                          type="button"
                          className="rounded-lg border border-cyan-500/30 bg-cyan-500/10 px-3 py-1 text-xs text-cyan-400 transition-colors hover:bg-cyan-500/20"
                        >
                          Apply Fix
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="rounded-xl border border-[#334155] bg-[#1e293b] p-5 text-center">
                <p className="font-semibold text-green-400">Well optimized!</p>
                <p className="mt-2 text-sm text-slate-400">
                  This stack does not show major savings opportunities right now.
                </p>
              </div>
            )}

            <p className="pt-4 text-center text-xs text-slate-600">
              Audited by CreditLens · creditlens-navy.vercel.app
            </p>
          </div>

          <div className="space-y-4">
            <div className="rounded-xl border border-[#334155] bg-[#1e293b] p-5">
              <h3 className="mb-3 font-semibold text-white">Share your audit</h3>
              <div className="mb-3 flex gap-2">
                <div className="flex-1 truncate rounded-lg border border-[#334155] bg-[#0f172a] px-3 py-2 text-sm text-slate-400">
                  creditlens-navy.vercel.app/audit/{id}
                </div>
                <ShareAuditButton
                  url={shareUrl}
                  idleLabel="⎘ Copy"
                  className="whitespace-nowrap rounded-lg border border-cyan-500/30 bg-cyan-500/10 px-3 py-2 text-sm text-cyan-400 transition-colors hover:bg-cyan-500/20"
                />
              </div>
              <Link
                href="/"
                className="block w-full rounded-lg border border-[#334155] py-2 text-center text-sm text-slate-400 transition-colors hover:border-slate-500 hover:text-slate-300"
              >
                ← Start New Audit
              </Link>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
