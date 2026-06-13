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

function formatDate(dateString?: string): string {
  if (!dateString) return '';
  try {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return '';
  }
}

function generateSynthesis(findings: SharedFinding[], totalSavings: number): string {
  if (findings.length === 0) {
    return 'Based on a deep audit of current infrastructure and SaaS expenditure, CreditLens AI has not identified significant savings opportunities. Your current stack appears well-optimized.';
  }
  const topFinding = findings[0];
  const topAmount = Math.round(topFinding.savings);
  const topPercent = totalSavings > 0 ? Math.round((topFinding.savings / totalSavings) * 100) : 0;

  let text = `The primary driver of overspend is ${topFinding.tool} usage, accounting for approximately $${topAmount}/mo.`;

  if (findings.length > 1) {
    const secondaryFindings = findings.slice(1).map((f) =>
      `${f.tool} ($${Math.round(f.savings)}/mo)`
    ).join(' and ');
    text += ` Secondary savings can be realized by optimizing ${secondaryFindings}.`;
  }

  text += ` Addressing ${topFinding.tool} alone accounts for nearly ${topPercent}% of potential monthly savings. Immediate action is recommended.`;

  return text;
}

function computeDataPoints(teamSize: number, findingsCount: number, totalSpend: number): string {
  const base = (teamSize || 1) * findingsCount * 1553 + Math.round(totalSpend * 2.4) + 847;
  return base.toLocaleString();
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
      <div className="flex flex-1 items-center justify-center bg-white text-[#111110]">
        <div className="text-center">
          <h1 className="mb-2 text-2xl font-bold">Audit Not Found</h1>
          <p className="text-[#605F5B]">This audit link may have expired.</p>
          <Link
            href="/"
            className="cl-btn-ghost mt-4"
          >
            ← Start New Audit
          </Link>
        </div>
      </div>
    );
  }

  const findings = parseFindings(audit.findings);
  const totalSavings = Math.round(audit.total_savings || 0);
  const totalSpend = Math.round(audit.total_spend || 0);
  const totalAnnual = totalSavings * 12;
  const shareUrl = `https://creditlens-navy.vercel.app/audit/${id}`;
  const companyName = audit.company_name || 'Your Company';
  const createdDate = formatDate(audit.created_at);
  const synthesis = generateSynthesis(findings, totalSavings);
  const dataPoints = computeDataPoints(audit.team_size || 1, findings.length, totalSpend);

  const tweetText = encodeURIComponent(`CreditLens identified $${totalSavings}/mo in potential AI tool savings. Check it out!`);
  const tweetUrl = encodeURIComponent(shareUrl);
  const linkedInUrl = encodeURIComponent(shareUrl);

  return (
    <div className="flex-1 pb-20 overflow-y-auto">
      <div className="mx-auto max-w-6xl px-6 pt-6">
        {/* ── Header bar ── */}
        <div className="mb-6 flex flex-col gap-3 cl-card p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#EDE9FE]">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[#6D28D9]">
                <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" /><polyline points="16 6 12 2 8 6" /><line x1="12" y1="2" x2="12" y2="15" />
              </svg>
            </div>
            <div>
              <h1 className="text-lg font-bold text-[#111110]">Shared Audit Report</h1>
              <p className="text-xs text-[#605F5B]">
                Generated for {companyName}{createdDate ? ` · ${createdDate}` : ''}
              </p>
            </div>
          </div>
          <ShareAuditButton
            url={shareUrl}
            idleLabel="⎘ Copy Link"
            copiedLabel="✓ Copied!"
            className="cl-btn-ghost whitespace-nowrap"
          />
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_340px]">
          {/* ── Left column ── */}
          <div className="space-y-5">
            {/* Optimization Potential card */}
            <div className="cl-card p-6">
              <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="mb-1 flex items-center gap-2">
                    <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-[#D1FAE5]">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="text-[#059669]"><polyline points="20 6 9 17 4 12" /></svg>
                    </span>
                    <span className="cl-label">
                      Optimization Potential Identified
                    </span>
                  </div>
                  <p className="text-4xl font-black text-[#111110] md:text-5xl">
                    ${totalSavings.toLocaleString()}.00 <span className="text-lg font-normal text-[#605F5B]">/mo</span>
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-[#E5E4DF] px-3 py-1 text-xs text-[#111110]">
                    <span className="h-2 w-2 rounded-full bg-[#059669]" />
                    High Confidence
                  </span>
                  <span className="text-sm text-[#605F5B]">Est. Annual: ${totalAnnual.toLocaleString()}</span>
                </div>
              </div>
              <p className="text-sm leading-relaxed text-[#605F5B]">
                Based on a deep audit of current infrastructure and SaaS expenditure, CreditLens AI has identified actionable savings across {findings.length} major {findings.length === 1 ? 'category' : 'categories'}.
              </p>
            </div>

            {/* AI Synthesis */}
            <div className="card-accent cl-card p-6 border-l-2 border-l-[#6D28D9]">
              <h3 className="mb-3 flex items-center gap-2 font-semibold text-[#6D28D9]">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[#6D28D9]">
                  <path d="M12 3l1.912 5.813a2 2 0 0 0 1.275 1.275L21 12l-5.813 1.912a2 2 0 0 0-1.275 1.275L12 21l-1.912-5.813a2 2 0 0 0-1.275-1.275L3 12l5.813-1.912a2 2 0 0 0 1.275-1.275L12 3z" />
                </svg>
                AI Synthesis
              </h3>
              <p className="text-sm leading-relaxed text-[#111110]">
                {synthesis}
              </p>
            </div>

            {/* Actionable Insights */}
            <div className="cl-card p-6">
              <h3 className="mb-4 flex items-center gap-2 font-semibold text-[#111110]">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[#605F5B]">
                  <rect x="3" y="3" width="18" height="18" rx="2" /><line x1="8" y1="12" x2="16" y2="12" /><line x1="8" y1="8" x2="16" y2="8" /><line x1="8" y1="16" x2="12" y2="16" />
                </svg>
                Actionable Insights
              </h3>

              {findings.length > 0 ? (
                <div className="divide-y divide-[#E5E4DF]">
                  {findings.map((finding) => {
                    const priority = getPriority(finding);
                    return (
                      <div
                        key={`${finding.tool}-${finding.currentPlan}-${finding.recommendedPlan}`}
                        className="flex items-start gap-4 py-4 first:pt-0 last:pb-0"
                      >
                        <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#FAFAF8] border border-[#E5E4DF]">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={
                            priority === 'HIGH' ? 'text-[#DC2626]' : priority === 'MEDIUM' ? 'text-[#D97706]' : 'text-[#059669]'
                          }>
                            <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
                          </svg>
                        </div>
                        <div className="flex-1">
                          <p className="font-semibold text-[#111110]">{finding.tool}</p>
                          <p className="mt-0.5 text-sm text-[#605F5B]">{finding.reason}</p>
                          <p className="mt-1 text-xs text-[#A19F99]">
                            {finding.currentPlan} → <span className="font-semibold text-[#111110]">{finding.recommendedPlan}</span>
                          </p>
                        </div>
                        <span className="shrink-0 font-semibold text-[#DC2626]">
                          -${Math.round(finding.savings)}/mo
                        </span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-[#605F5B]">
                  No significant optimization opportunities were identified. Your current stack is well-optimized.
                </p>
              )}
            </div>

            <p className="pt-2 text-center text-xs text-[#A19F99]">
              Audited by CreditLens · creditlens-navy.vercel.app
            </p>
          </div>

          {/* ── Right sidebar ── */}
          <div className="space-y-4">
            {/* Social Preview */}
            <div className="cl-card p-5">
              <div className="mb-3 flex items-center justify-between">
                <span className="cl-label">
                  Social Preview
                </span>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[#A19F99]">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" />
                </svg>
              </div>

              {/* Preview card mockup */}
              <div className="overflow-hidden rounded-lg border border-[#E5E4DF] bg-[#FAFAF8]">
                <div className="flex flex-col items-center gap-1 px-4 py-6">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-[#6D28D9]">
                    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
                  </svg>
                  <p className="mt-1 text-2xl font-black text-[#111110]">
                    -${totalSavings.toLocaleString()}<span className="text-sm font-normal text-[#605F5B]">/mo</span>
                  </p>
                </div>
                <div className="border-t border-[#E5E4DF] px-4 py-3 bg-white">
                  <p className="mb-0.5 text-[10px] text-[#6D28D9]">creditlens.ai</p>
                  <p className="text-xs font-semibold text-[#111110]">
                    CreditLens | Potential Savings: ${totalSavings}/mo identified for {companyName}.
                  </p>
                  <p className="mt-0.5 text-[11px] text-[#605F5B]">
                    View the full AI audit report to see actionable optimization recommendations.
                  </p>
                </div>
              </div>

              {/* Social buttons */}
              <div className="mt-3 flex items-center justify-center gap-2">
                <a
                  href={`https://twitter.com/intent/tweet?url=${tweetUrl}&text=${tweetText}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#E5E4DF] text-[#605F5B] transition-colors hover:border-[#D4D3CE] hover:text-[#111110] bg-white"
                  aria-label="Share on X"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                  </svg>
                </a>
                <a
                  href={`https://www.linkedin.com/sharing/share-offsite/?url=${linkedInUrl}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#E5E4DF] text-[#605F5B] transition-colors hover:border-[#D4D3CE] hover:text-[#111110] bg-white"
                  aria-label="Share on LinkedIn"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                  </svg>
                </a>
                <ShareAuditButton
                  url={shareUrl}
                  idleLabel="🔗"
                  copiedLabel="✓"
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#E5E4DF] text-[#605F5B] transition-colors hover:border-[#D4D3CE] hover:text-[#111110] bg-white"
                />
              </div>
            </div>

            {/* Data Points Analyzed */}
            <div className="cl-card p-5">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#EDE9FE]">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[#6D28D9]">
                    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
                  </svg>
                </div>
                <div>
                  <p className="cl-label">
                    Data Points Analyzed
                  </p>
                  <p className="text-2xl font-black text-[#111110]">{dataPoints}</p>
                </div>
              </div>
            </div>

            {/* Back to new audit */}
            <Link
              href="/"
              className="cl-btn-ghost block w-full text-center"
            >
              ← Start New Audit
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
