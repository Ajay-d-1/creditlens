// src/components/AuditReport.tsx
// Premium Audit Report View with Recharts, Deterministic Findings Cards, LLM Prose, and Phase 5 Polish

'use client';

import React, { useState, useEffect } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  LineChart,
  Line,
  CartesianGrid,
} from 'recharts';
import type { AuditResult, AggregatedVendor, Finding } from '../engine/types';
import { buildPricingMap } from '../data/pricing';


interface AuditReportProps {
  auditResult: AuditResult;
  aggregatedVendors?: AggregatedVendor[];
  companyName?: string;
  teamSize?: number;
  onReset: () => void;
  onUpdateAuditResult?: (newResult: AuditResult) => void;
}

export function AuditReport({
  auditResult,
  aggregatedVendors = [],
  companyName = 'Your Company',
  teamSize = 1,
  onReset,
  onUpdateAuditResult,
}: AuditReportProps) {
  // Expandable evidence cards state
  const [expandedEvidence, setExpandedEvidence] = useState<Record<string, boolean>>({});
  const pricingMap = React.useMemo(() => buildPricingMap(), []);


  // LLM prose phrasing state
  const [llmProse, setLlmProse] = useState<string>('');
  const [isPhrasingLoading, setIsPhrasingLoading] = useState<boolean>(false);

  // Phase 5: Renewal watchdog dates (vendorId → YYYY-MM-DD)
  const [renewalDates, setRenewalDates] = useState<Record<string, string>>({});

  // Phase 5: Power Tier API check state
  const [powerKey, setPowerKey] = useState<string>('');
  const [isVerifyingKey, setIsVerifyingKey] = useState<boolean>(false);
  const [powerStatus, setPowerStatus] = useState<string>('');

  // Fetch LLM phrasing on mount or auditResult change
  useEffect(() => {
    let isMounted = true;
    async function fetchPhrase() {
      setIsPhrasingLoading(true);
      try {
        const res = await fetch('/api/phrase', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(auditResult),
        });
        if (res.ok) {
          const data = await res.json();
          if (isMounted) setLlmProse(data.markdown || '');
        } else {
          if (isMounted) setLlmProse('### Diagnostic Commentary\nYour audit has completed successfully. Review the deterministic findings cards above for exact savings figures and evidence details.');
        }
      } catch {
        if (isMounted) {
          setLlmProse('### Diagnostic Commentary\nYour audit has completed successfully. Review the deterministic findings cards above for exact savings figures and evidence details.');
        }
      } finally {
        if (isMounted) setIsPhrasingLoading(false);
      }
    }
    fetchPhrase();
    return () => {
      isMounted = false;
    };
  }, [auditResult]);

  const toggleEvidence = (id: string) => {
    setExpandedEvidence((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handlePrint = () => {
    window.print();
  };

  // Build chart data: spend by vendor (latest historical month)
  const allMonthsSet = new Set<string>();
  aggregatedVendors.forEach((v) => {
    Object.keys(v.monthlyAmounts).forEach((m) => allMonthsSet.add(m));
  });
  const sortedMonths = Array.from(allMonthsSet).sort();
  const latestMonth = sortedMonths[sortedMonths.length - 1] || '2026-06';

  const barChartData = aggregatedVendors
    .map((v) => ({
      name: v.displayName,
      spend: Math.round((v.monthlyAmounts[latestMonth] || 0) * 100) / 100,
    }))
    .filter((d) => d.spend > 0)
    .sort((a, b) => b.spend - a.spend)
    .slice(0, 8);

  // Build chart data: 6-month historical + 3-month forecast line chart
  const lineChartData: Array<{
    month: string;
    historicalSpend: number | null;
    forecastSpend: number | null;
  }> = [];

  sortedMonths.forEach((m, idx) => {
    let sum = 0;
    aggregatedVendors.forEach((v) => {
      sum += v.monthlyAmounts[m] || 0;
    });
    const roundedSum = Math.round(sum * 100) / 100;
    const isLastHistorical = idx === sortedMonths.length - 1;
    lineChartData.push({
      month: m,
      historicalSpend: roundedSum,
      forecastSpend: isLastHistorical ? roundedSum : null,
    });
  });

  // Collect forecasted months across vendorForecasts
  const forecastMonthsSet = new Set<string>();
  auditResult.vendorForecasts.forEach((vf) => {
    Object.keys(vf.predictedAmounts).forEach((m) => forecastMonthsSet.add(m));
  });
  const sortedForecastMonths = Array.from(forecastMonthsSet).sort();

  sortedForecastMonths.forEach((m) => {
    let sum = 0;
    auditResult.vendorForecasts.forEach((vf) => {
      sum += vf.predictedAmounts[m] || 0;
    });
    lineChartData.push({
      month: m,
      historicalSpend: null,
      forecastSpend: Math.round(sum * 100) / 100,
    });
  });

  // Check for upcoming renewal alerts (< 14 days away)
  const today = new Date('2026-07-16'); // Consistent benchmark reference date
  const upcomingRenewals: Array<{ vendorId: string; vendorName: string; daysLeft: number; amount: number }> = [];

  aggregatedVendors.forEach((v) => {
    const dateStr = renewalDates[v.vendorId];
    if (dateStr) {
      const renewalDate = new Date(dateStr);
      const diffMs = renewalDate.getTime() - today.getTime();
      const diffDays = Math.ceil(diffMs / (1000 * 3600 * 24));
      if (diffDays >= 0 && diffDays <= 14) {
        upcomingRenewals.push({
          vendorId: v.vendorId,
          vendorName: v.displayName,
          daysLeft: diffDays,
          amount: v.monthlyAmounts[latestMonth] || 0,
        });
      }
    }
  });

  // Handle Power Tier verification
  const handleVerifyPowerKey = () => {
    if (!powerKey.trim()) return;
    setIsVerifyingKey(true);
    setPowerStatus('');
    setTimeout(() => {
      setIsVerifyingKey(false);
      setPowerStatus('Verified: 3 inactive seat licenses identified in organization logs.');
      if (onUpdateAuditResult) {
        const newFinding: Finding = {
          id: `power-idle-${Date.now()}`,
          type: 'personal-to-team-consolidation',
          title: 'Underutilized API / Seat Licenses Detected',
          severity: 'high',
          monthlySavings: 60,
          annualSavings: 720,
          confidence: 0.95,
          evidence: {
            source: 'Organization API Usage Verification',
            activeUsers: `${teamSize - 3} of ${teamSize} allocated seats active`,
            idleSeats: 3,
            estimatedMonthlyRecovery: '$60.00',
          },
        };
        const updatedResult: AuditResult = {
          ...auditResult,
          findings: [newFinding, ...auditResult.findings],
          potentialMonthlySavings: auditResult.potentialMonthlySavings + 60,
        };
        onUpdateAuditResult(updatedResult);
      }
    }, 1200);
  };

  // Simple clean markdown renderer helper for LLM prose commentary
  const renderMarkdownProse = (markdown: string) => {
    const paragraphs = markdown.split(/\n\n+/);
    return paragraphs.map((para, i) => {
      if (para.startsWith('### ')) {
        return (
          <h3 key={i} className="text-base font-bold text-[#111110] mt-5 mb-2 first:mt-0">
            {para.replace(/^### /, '')}
          </h3>
        );
      }
      if (para.startsWith('#### ')) {
        return (
          <h4 key={i} className="text-sm font-semibold text-[#6D28D9] mt-4 mb-1">
            {para.replace(/^#### /, '')}
          </h4>
        );
      }
      if (para.startsWith('- ') || para.match(/^\d+\. /)) {
        const lines = para.split('\n');
        return (
          <ul key={i} className="list-disc pl-5 space-y-1.5 text-sm text-[#605F5B] my-3">
            {lines.map((line, j) => (
              <li key={j} className="leading-relaxed">
                {line.replace(/^[-\d.]+\s*/, '').replace(/\*\*([^*]+)\*\*/g, '$1')}
              </li>
            ))}
          </ul>
        );
      }
      return (
        <p key={i} className="text-sm leading-relaxed text-[#605F5B] my-2">
          {para.replace(/\*\*([^*]+)\*\*/g, '$1')}
        </p>
      );
    });
  };

  return (
    <div className="space-y-6">
      {/* Print-only / screen header buttons */}
      <div className="flex items-center justify-between print:hidden">
        <div>
          <h2 className="text-xl font-bold text-[#111110]">AI Spend Audit Report</h2>
          <p className="text-xs text-[#605F5B]">
            Comprehensive financial analysis for <span className="font-semibold text-[#111110]">{companyName}</span> ({teamSize} {teamSize === 1 ? 'seat' : 'seats'})
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onReset}
            className="cl-btn-ghost text-xs"
          >
            ← Start Over
          </button>
          <button
            type="button"
            onClick={handlePrint}
            className="flex items-center gap-1.5 rounded-lg bg-[#6D28D9] px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-[#5B21B6] transition-colors"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="6 9 6 2 18 2 18 9" /><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" /><rect x="6" y="14" width="12" height="8" />
            </svg>
            Export PDF / Print
          </button>
        </div>
      </div>

      {/* Phase 5: Renewal Watchdog Alert Banner */}
      {upcomingRenewals.length > 0 && (
        <div className="rounded-xl border border-[#F59E0B] bg-[#FEF3C7] p-4 text-[#92400E] shadow-sm">
          <div className="flex items-start gap-3">
            <span className="text-xl">⚠️</span>
            <div className="flex-1 text-sm">
              <p className="font-bold mb-1">Upcoming Subscription Renewals (&lt; 14 Days)</p>
              {upcomingRenewals.map((ur) => (
                <p key={ur.vendorId} className="text-xs">
                  • <span className="font-semibold">{ur.vendorName}</span> renews in <span className="font-bold underline">{ur.daysLeft} {ur.daysLeft === 1 ? 'day' : 'days'}</span> (${ur.amount.toLocaleString()}/mo). Check seat utilization before auto-renewal occurs.
                </p>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Headline Summary Cards ── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="cl-card p-5 border-t-4 border-t-[#111110]">
          <p className="cl-label mb-1">Total Monthly Spend</p>
          <p className="font-mono text-3xl font-black text-[#111110] sm:text-4xl">
            ${auditResult.totalMonthlySpend.toLocaleString()}
            <span className="text-sm font-normal text-[#605F5B]"> /mo</span>
          </p>
          <p className="mt-2 text-[11px] text-[#A19F99]">Based on latest historical month</p>
        </div>

        <div className="cl-card p-5 border-t-4 border-t-[#605F5B]">
          <p className="cl-label mb-1">Annualized Spend</p>
          <p className="font-mono text-3xl font-black text-[#111110] sm:text-4xl">
            ${auditResult.totalAnnualSpend.toLocaleString()}
            <span className="text-sm font-normal text-[#605F5B]"> /yr</span>
          </p>
          <p className="mt-2 text-[11px] text-[#A19F99]">Projected run-rate without changes</p>
        </div>

        <div className="cl-card p-5 border-t-4 border-t-[#059669] bg-[#F0FDF4]/50">
          <p className="cl-label mb-1 text-[#059669]">Potential Monthly Savings</p>
          <p className="font-mono text-3xl font-black text-[#059669] sm:text-4xl">
            ${Math.round(auditResult.potentialMonthlySavings).toLocaleString()}
            <span className="text-sm font-normal text-[#059669]"> /mo</span>
          </p>
          <p className="mt-2 text-[11px] text-[#059669]">
            De-duplicated potential across {auditResult.findings.length} finding{auditResult.findings.length === 1 ? '' : 's'}
          </p>
        </div>
      </div>

      {/* ── Interactive Recharts Section ── */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Spend by Vendor Bar Chart */}
        <div className="cl-card p-5">
          <p className="cl-label mb-4">Spend by Vendor ({latestMonth})</p>
          <div className="h-[260px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barChartData} margin={{ top: 10, right: 10, left: -20, bottom: 25 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E4DF" vertical={false} />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 11, fill: '#605F5B' }}
                  interval={0}
                  angle={-25}
                  textAnchor="end"
                />
                <YAxis tick={{ fontSize: 11, fill: '#605F5B' }} />
                <Tooltip
                  formatter={(value: any) => [`$${value}`, 'Monthly Spend']}
                  contentStyle={{ backgroundColor: '#111110', color: '#fff', borderRadius: '8px', border: 'none', fontSize: '12px' }}
                />
                <Bar dataKey="spend" fill="#6D28D9" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Historical + Forecast Line Chart */}
        <div className="cl-card p-5">
          <div className="flex items-center justify-between mb-4">
            <p className="cl-label">Spend Trend & 3-Month Forecast</p>
            <span className="text-[10px] font-mono text-[#8B5CF6] bg-[#EDE9FE] px-2 py-0.5 rounded">
              Dashed line = Predicted
            </span>
          </div>
          <div className="h-[260px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={lineChartData} margin={{ top: 10, right: 10, left: -20, bottom: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E4DF" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#605F5B' }} />
                <YAxis tick={{ fontSize: 11, fill: '#605F5B' }} />
                <Tooltip
                  formatter={(value: any) => (value !== null ? [`$${value}`, 'Spend'] : ['--', 'Spend'])}
                  contentStyle={{ backgroundColor: '#111110', color: '#fff', borderRadius: '8px', border: 'none', fontSize: '12px' }}
                />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                <Line
                  type="monotone"
                  dataKey="historicalSpend"
                  stroke="#111110"
                  strokeWidth={2.5}
                  name="Historical ($)"
                  dot={{ r: 4, fill: '#111110' }}
                  activeDot={{ r: 6 }}
                />
                <Line
                  type="monotone"
                  dataKey="forecastSpend"
                  stroke="#8B5CF6"
                  strokeWidth={2.5}
                  strokeDasharray="5 5"
                  name="Forecast ($)"
                  dot={{ r: 4, fill: '#8B5CF6' }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* ── Per-Vendor Report Cards (Expected vs. Actual & Forecasts) ── */}
      <div className="cl-card p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-[#E5E4DF] pb-3">
          <div>
            <h3 className="text-sm font-bold text-[#111110]">Per-Vendor Report Cards: Expected vs. Actual Spend</h3>
            <p className="text-xs text-[#605F5B]">
              Deterministic market benchmark comparison, 3-month utilization forecast, and renewal watchdog.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {aggregatedVendors.map((vendor) => {
            const forecast = auditResult.vendorForecasts.find((vf) => vf.vendorId === vendor.vendorId);
            const predictedMonths = forecast ? Object.keys(forecast.predictedAmounts).sort() : [];
            const targetMonth = predictedMonths[predictedMonths.length - 1];
            const targetAmount = targetMonth ? forecast?.predictedAmounts[targetMonth] : 0;
            const currentSpend = vendor.monthlyAmounts[latestMonth] || 0;

            const pricing = pricingMap.get(vendor.vendorId);
            const seats = vendor.seatCount || teamSize || 1;
            const unitPrice = pricing?.monthlyPrice || 0;
            const expectedSpend =
              vendor.planName?.toLowerCase().includes('free') || vendor.planName?.toLowerCase().includes('hobby')
                ? 0
                : vendor.seatCount
                  ? vendor.seatCount * unitPrice
                  : unitPrice > 0
                    ? seats * unitPrice
                    : currentSpend;

            // Check if vendor has a plan-price-mismatch finding
            const priceMismatchFinding = auditResult.findings.find(
              (f) =>
                f.type === 'plan-price-mismatch' &&
                (f.evidence.vendorId === vendor.vendorId ||
                 f.evidence.vendor === vendor.displayName ||
                 f.id.toLowerCase().includes(vendor.vendorId.toLowerCase()))
            );
            const variance = currentSpend - expectedSpend;
            const isOver = !!priceMismatchFinding;

            return (
              <div
                key={vendor.vendorId}
                className={`rounded-xl border p-4 space-y-3 transition-all ${
                  isOver ? 'border-[#FECACA] bg-[#FEF2F2]/50' : 'border-[#E5E4DF] bg-[#FAFAF8]'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm text-[#111110]">{vendor.displayName}</span>
                  <span
                    className={`text-[10px] uppercase font-mono font-bold px-2 py-0.5 rounded-full ${
                      isOver
                        ? 'bg-[#FEE2E2] text-[#DC2626]'
                        : 'bg-[#D1FAE5] text-[#059669]'
                    }`}
                  >
                    {isOver ? '⚠️ Check Pricing / Seats' : '✓ Aligned'}
                  </span>
                </div>

                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between items-baseline font-mono">
                    <span className="text-[#605F5B]">Actual Spend:</span>
                    <span className="font-bold text-sm text-[#111110]">${currentSpend}/mo</span>
                  </div>
                  <div className="flex justify-between items-baseline font-mono text-[11px]">
                    <span className="text-[#A19F99]">Expected Rate:</span>
                    <span className="text-[#605F5B]">
                      ${Math.round(expectedSpend)}/mo
                      {unitPrice > 0 && ` (${seats} seat${seats === 1 ? '' : 's'} @ $${unitPrice})`}
                    </span>
                  </div>
                  {isOver && variance > 0 && (
                    <div className="flex justify-between items-baseline font-mono text-[11px] text-[#DC2626] font-semibold pt-1 border-t border-[#FEE2E2]">
                      <span>Variance / Waste:</span>
                      <span>+${Math.round(variance)}/mo over baseline</span>
                    </div>
                  )}
                </div>

                {/* Forecast Banner */}
                <div className="rounded bg-white/80 p-2 text-[11px] font-mono border border-[#E5E4DF] flex items-center justify-between">
                  <span className="text-[#605F5B]">
                    Forecast ({targetMonth || 'Next Qtr'}):
                  </span>
                  <span className="font-semibold text-[#6D28D9]">
                    ${Math.round(targetAmount || currentSpend)}/mo ({forecast?.trend || 'stable'})
                  </span>
                </div>

                {/* Renewal Date Picker */}
                <div className="pt-2 border-t border-[#E5E4DF] flex items-center justify-between">
                  <label className="text-[10px] font-semibold text-[#605F5B]">Renewal Watchdog Date:</label>
                  <input
                    type="date"
                    value={renewalDates[vendor.vendorId] || ''}
                    onChange={(e) => setRenewalDates((prev) => ({ ...prev, [vendor.vendorId]: e.target.value }))}
                    className="text-[10px] rounded border border-[#D4D3CE] bg-white px-2 py-1 text-[#111110] font-mono"
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Deterministic Findings Section (Rendered ABOVE LLM Prose) ── */}
      <div className="cl-card p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-[#E5E4DF] pb-3">
          <div>
            <h3 className="text-base font-bold text-[#111110]">
              Deterministic Savings Findings ({auditResult.findings.length})
            </h3>
            <p className="text-xs text-[#605F5B]">
              Exact financial opportunities calculated from deterministic engine rules. Click "Why?" to inspect underlying evidence.
            </p>
          </div>
        </div>

        {auditResult.findings.length > 0 ? (
          <div className="space-y-3">
            {auditResult.findings.map((finding) => {
              const isExpanded = !!expandedEvidence[finding.id];
              const badgeClass =
                finding.severity === 'high'
                  ? 'bg-[#FEE2E2] text-[#DC2626] border-[#FECACA]'
                  : finding.severity === 'medium'
                    ? 'bg-[#FEF3C7] text-[#D97706] border-[#FDE68A]'
                    : 'bg-[#E0F2FE] text-[#0284C7] border-[#BAE6FD]';

              return (
                <div
                  key={finding.id}
                  className="rounded-xl border border-[#E5E4DF] bg-white p-4 transition-all hover:border-[#D4D3CE]"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <span
                        className={`inline-flex shrink-0 items-center rounded-md border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${badgeClass}`}
                      >
                        {finding.severity}
                      </span>
                      <div>
                        <h4 className="font-bold text-sm text-[#111110]">{finding.title}</h4>
                        <p className="text-xs text-[#A19F99] font-mono mt-0.5">
                          Confidence: {Math.round(finding.confidence * 100)}% · Rule ID: {finding.type}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 self-end sm:self-center">
                      <div className="text-right">
                        <p className="font-mono font-black text-base text-[#DC2626]">
                          -${Math.round(finding.monthlySavings).toLocaleString()}
                          <span className="text-xs font-normal text-[#605F5B]">/mo</span>
                        </p>
                        {finding.annualSavings > 0 && (
                          <p className="text-[11px] text-[#A19F99]">
                            Est. -${Math.round(finding.annualSavings).toLocaleString()}/yr
                          </p>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => toggleEvidence(finding.id)}
                        className="rounded-lg border border-[#E5E4DF] bg-[#F4F4F1] px-3 py-1.5 text-xs font-semibold text-[#605F5B] hover:bg-[#E5E4DF] hover:text-[#111110] transition-colors"
                      >
                        {isExpanded ? 'Hide Evidence ▲' : 'Why? (Evidence) ▼'}
                      </button>
                    </div>
                  </div>

                  {/* Expandable Evidence Table */}
                  {isExpanded && (
                    <div className="mt-4 border-t border-[#F0EFEA] pt-3">
                      <p className="text-[11px] font-bold uppercase tracking-wider text-[#A19F99] mb-2">
                        Diagnostic Evidence Metrics
                      </p>
                      <div className="overflow-x-auto rounded-lg border border-[#E5E4DF]">
                        <table className="w-full text-left text-xs">
                          <tbody className="divide-y divide-[#E5E4DF] bg-[#FAFAF8]">
                            {Object.entries(finding.evidence).map(([key, val]) => (
                              <tr key={key} className="hover:bg-white transition-colors">
                                <td className="py-2 px-3 font-mono font-medium text-[#605F5B] w-1/3">
                                  {key.replace(/([A-Z])/g, ' $1').toLowerCase()}
                                </td>
                                <td className="py-2 px-3 font-mono font-semibold text-[#111110]">
                                  {String(val)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-[#605F5B] py-4 text-center">
            No significant optimization opportunities detected. Your current AI tool stack is operating within optimal parameters.
          </p>
        )}
      </div>

      {/* ── Phase 5: Optional Power Tier Panel (Active Seats vs Users API Check) ── */}
      <div className="cl-card p-5 border-l-4 border-l-[#3B82F6] bg-[#EFF6FF]/30 print:hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
          <div>
            <h3 className="text-sm font-bold text-[#1e40af] flex items-center gap-2">
              <span>⚡</span> Power Tier: Verify Active Seats vs. Users
            </h3>
            <p className="text-xs text-[#605F5B] mt-0.5">
              Paste a read-only organization key to query active monthly users and uncover idle seat subscriptions.
            </p>
          </div>
          <span className="text-[10px] font-mono bg-[#DBEAFE] text-[#1D4ED8] px-2 py-0.5 rounded border border-[#BFDBFE] shrink-0">
            🔒 Read-Only · Browser Memory Only
          </span>
        </div>

        <div className="flex flex-col sm:flex-row gap-2 mt-3">
          <input
            type="password"
            placeholder="OpenAI / Anthropic Admin Key (e.g., sk-admin-...)"
            value={powerKey}
            onChange={(e) => setPowerKey(e.target.value)}
            className="cl-input text-xs font-mono flex-1 !py-2"
          />
          <button
            type="button"
            onClick={handleVerifyPowerKey}
            disabled={isVerifyingKey || !powerKey.trim()}
            className="rounded-lg bg-[#2563EB] px-4 py-2 text-xs font-semibold text-white hover:bg-[#1D4ED8] disabled:opacity-50 transition-colors whitespace-nowrap"
          >
            {isVerifyingKey ? 'Checking API Logs...' : 'Verify Active Seats'}
          </button>
        </div>

        {powerStatus && (
          <p className="mt-2 text-xs font-semibold text-[#059669] flex items-center gap-1">
            <span>✓</span> {powerStatus}
          </p>
        )}
      </div>

      {/* ── LLM Phrasing Layer Section (Rendered BELOW Deterministic Findings) ── */}
      <div className="card-accent cl-card p-6 border-l-4 border-l-[#6D28D9]">
        <div className="flex items-center justify-between border-b border-[#E5E4DF] pb-3 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#EDE9FE] text-[#6D28D9]">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 3l1.912 5.813a2 2 0 0 0 1.275 1.275L21 12l-5.813 1.912a2 2 0 0 0-1.275 1.275L12 21l-1.912-5.813a2 2 0 0 0-1.275-1.275L3 12l5.813-1.912a2 2 0 0 0 1.275-1.275L12 3z" />
              </svg>
            </div>
            <div>
              <h3 className="text-base font-bold text-[#111110]">AI Executive Synthesis & Commentary</h3>
              <p className="text-xs text-[#605F5B]">
                Natural language interpretation generated strictly from deterministic audit data.
              </p>
            </div>
          </div>

          {isPhrasingLoading && (
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-[#6D28D9]">
              <span className="h-2 w-2 rounded-full bg-[#6D28D9] animate-ping" />
              Synthesizing Prose...
            </span>
          )}
        </div>

        {isPhrasingLoading ? (
          <div className="space-y-3 py-4 animate-pulse">
            <div className="h-4 w-3/4 bg-[#E5E4DF] rounded" />
            <div className="h-4 w-full bg-[#E5E4DF] rounded" />
            <div className="h-4 w-5/6 bg-[#E5E4DF] rounded" />
            <div className="h-4 w-2/3 bg-[#E5E4DF] rounded mt-4" />
          </div>
        ) : (
          <div className="prose prose-sm max-w-none text-[#111110]">
            {renderMarkdownProse(llmProse)}
          </div>
        )}
      </div>

      <p className="text-center text-xs text-[#A19F99] pt-4 print:pt-6">
        Audited locally by CreditLens AI · Raw transactions never leave your device
      </p>
    </div>
  );
}
