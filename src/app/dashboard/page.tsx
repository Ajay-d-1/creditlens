'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import {
  LayoutDashboard,
  TrendingDown,
  Clock,
  ExternalLink,
  DollarSign,
  Activity,
  AlertCircle,
  CheckCircle2,
  PieChart as PieIcon,
  PlusCircle,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

interface StoredAudit {
  id: string;
  date: string;
  toolCount: number;
  totalSpend: number;
  totalSavings: number;
  shareId?: string;
  categories?: Record<string, number>;
  topFindingTitle?: string;
}

const CATEGORY_COLORS: Record<string, string> = {
  coding: '#6D28D9',
  chat: '#3B82F6',
  api: '#10B981',
  image: '#F59E0B',
  audio: '#EC4899',
  video: '#8B5CF6',
  productivity: '#64748B',
};

export default function DashboardPage() {
  const [audits, setAudits] = useState<StoredAudit[]>([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem('creditlens_audit_history');
      if (raw) setAudits(JSON.parse(raw));
    } catch {}
  }, []);

  const totalSavingsFound = audits.reduce((s, a) => s + a.totalSavings, 0);
  const totalSpendFound = audits.reduce((s, a) => s + a.totalSpend, 0);
  const savingsRate = totalSpendFound > 0 ? (totalSavingsFound / totalSpendFound) * 100 : 0;

  // Composite Health Score (100 is best, lower when high waste percentage)
  const healthScore = Math.max(10, Math.min(100, Math.round(100 - (savingsRate * 0.8))));
  const healthColor =
    healthScore >= 80 ? 'text-[#059669] bg-[#D1FAE5]' : healthScore >= 50 ? 'text-[#D97706] bg-[#FEF3C7]' : 'text-[#DC2626] bg-[#FEE2E2]';

  const latestAudit = audits[0];
  const latestDate = latestAudit?.date
    ? new Date(latestAudit.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : '—';

  // Trend chart data (chronological order of up to last 10 audits)
  const trendData = useMemo(() => {
    return [...audits]
      .slice(0, 10)
      .reverse()
      .map((a, i) => ({
        name: `Audit #${i + 1}`,
        date: new Date(a.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        Spend: a.totalSpend,
        Savings: a.totalSavings,
      }));
  }, [audits]);

  // Category breakdown aggregated across audits (or from latest audit)
  const categoryData = useMemo(() => {
    const counts: Record<string, number> = {};
    const targetAudits = latestAudit?.categories ? [latestAudit] : audits;
    targetAudits.forEach((a) => {
      if (a.categories) {
        Object.entries(a.categories).forEach(([cat, val]) => {
          counts[cat] = (counts[cat] || 0) + val;
        });
      } else {
        counts['productivity'] = (counts['productivity'] || 0) + a.totalSpend;
      }
    });
    return Object.entries(counts)
      .filter(([_, val]) => val > 0)
      .map(([name, value]) => ({
        name: name.charAt(0).toUpperCase() + name.slice(1),
        rawKey: name,
        value,
      }));
  }, [audits, latestAudit]);

  const highestSpendAudit = useMemo(() => {
    if (audits.length === 0) return null;
    return audits.reduce((max, a) => (a.totalSpend > max.totalSpend ? a : max), audits[0]);
  }, [audits]);

  return (
    <div className="flex flex-col h-full overflow-hidden bg-[#FAFAF8]">
      {/* Top bar */}
      <div className="flex items-center justify-between px-6 py-3.5 border-b border-[#E5E4DF] bg-white shrink-0 shadow-xs">
        <div>
          <h1 className="text-[14px] font-semibold text-[#111110]">Executive Audit Dashboard</h1>
          <p className="text-[11px] text-[#A19F99] mt-0.5">Real-time spend tracking, waste analytics, and optimization insights</p>
        </div>
        <Link href="/" className="cl-btn-primary text-[12px] py-2 px-4 rounded-lg inline-flex items-center gap-1.5 shadow-sm">
          <PlusCircle size={14} /> New Audit
        </Link>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Top KPI row */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="cl-card p-4 bg-white">
            <div className="flex items-center justify-between text-[#A19F99] mb-2">
              <span className="cl-label">Health Score</span>
              <Activity size={15} className="text-[#6D28D9]" />
            </div>
            <div className="flex items-baseline gap-2.5">
              <span className="text-[24px] font-semibold text-[#111110] font-mono">{audits.length > 0 ? healthScore : '—'}</span>
              {audits.length > 0 && (
                <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${healthColor}`}>
                  {healthScore >= 80 ? 'Good' : healthScore >= 50 ? 'Warning' : 'Critical'}
                </span>
              )}
            </div>
            <p className="text-[10px] text-[#A19F99] mt-2">Composite efficiency rating across vendors</p>
          </div>

          <div className="cl-card p-4 bg-white">
            <div className="flex items-center justify-between text-[#A19F99] mb-2">
              <span className="cl-label">Total Savings Found</span>
              <TrendingDown size={15} className="text-[#059669]" />
            </div>
            <div className="text-[24px] font-semibold text-[#059669] font-mono">${totalSavingsFound.toLocaleString()}</div>
            <div className="mt-2 flex items-center gap-2">
              <div className="flex-1 bg-[#F4F4F1] h-1.5 rounded-full overflow-hidden">
                <div
                  className="bg-[#059669] h-full transition-all duration-500"
                  style={{ width: `${Math.min(100, savingsRate)}%` }}
                />
              </div>
              <span className="text-[10px] font-mono font-medium text-[#605F5B]">{savingsRate.toFixed(0)}% rate</span>
            </div>
          </div>

          <div className="cl-card p-4 bg-white">
            <div className="flex items-center justify-between text-[#A19F99] mb-2">
              <span className="cl-label">Audited Spend Monitored</span>
              <DollarSign size={15} className="text-[#3B82F6]" />
            </div>
            <div className="text-[24px] font-semibold text-[#111110] font-mono">${totalSpendFound.toLocaleString()}</div>
            <p className="text-[10px] text-[#A19F99] mt-2">Across {audits.length} total audit runs</p>
          </div>

          <div className="cl-card p-4 bg-white">
            <div className="flex items-center justify-between text-[#A19F99] mb-2">
              <span className="cl-label">Latest Audit Date</span>
              <Clock size={15} className="text-[#8B5CF6]" />
            </div>
            <div className="text-[20px] font-semibold text-[#111110] font-mono mt-1">{latestDate}</div>
            <p className="text-[10px] text-[#A19F99] mt-2 truncate">
              {latestAudit ? `${latestAudit.toolCount} tools analyzed` : 'No recent activity'}
            </p>
          </div>
        </div>

        {audits.length === 0 ? (
          /* Actionable Empty State */
          <div className="cl-card p-12 text-center bg-white border border-dashed border-[#E5E4DF]">
            <div className="w-12 h-12 rounded-full bg-[#EDE9FE] text-[#6D28D9] flex items-center justify-center mx-auto mb-4">
              <LayoutDashboard size={22} />
            </div>
            <h3 className="text-[15px] font-semibold text-[#111110]">No audit history yet</h3>
            <p className="text-[#A19F99] text-[12px] max-w-md mx-auto mt-1.5 mb-5">
              Get instant visibility into unused AI tools, duplicate seats, and over-benchmark pricing by running your first automated audit.
            </p>
            <Link href="/" className="cl-btn-primary inline-flex items-center gap-2 text-[12px] px-5 py-2.5">
              <PlusCircle size={14} /> Start First Audit
            </Link>
          </div>
        ) : (
          <>
            {/* Visual Charts Row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Spend vs Savings Area Chart */}
              <div className="cl-card p-5 bg-white md:col-span-2 flex flex-col">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="cl-label text-[#111110] font-semibold">Spend & Savings Trend</h3>
                    <p className="text-[11px] text-[#A19F99]">Historical comparison of audited spend vs potential savings</p>
                  </div>
                  <div className="flex items-center gap-3 text-[11px] font-medium">
                    <span className="flex items-center gap-1.5 text-[#3B82F6]">
                      <span className="w-2.5 h-2.5 rounded-sm bg-[#3B82F6]" /> Total Spend
                    </span>
                    <span className="flex items-center gap-1.5 text-[#059669]">
                      <span className="w-2.5 h-2.5 rounded-sm bg-[#059669]" /> Potential Savings
                    </span>
                  </div>
                </div>
                <div className="h-[210px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={trendData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="spendGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.2} />
                          <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="savingsGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#059669" stopOpacity={0.25} />
                          <stop offset="95%" stopColor="#059669" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#A19F99' }} stroke="#E5E4DF" />
                      <YAxis tick={{ fontSize: 10, fill: '#A19F99' }} stroke="#E5E4DF" tickFormatter={(v) => `$${v}`} />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#fff', border: '1px solid #E5E4DF', borderRadius: '8px', fontSize: '11px' }}
                        formatter={(value: any) => [`$${Number(value).toLocaleString()}`, '']}
                      />
                      <Area type="monotone" dataKey="Spend" stroke="#3B82F6" fillOpacity={1} fill="url(#spendGrad)" strokeWidth={2} />
                      <Area type="monotone" dataKey="Savings" stroke="#059669" fillOpacity={1} fill="url(#savingsGrad)" strokeWidth={2} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Category Breakdown Donut Chart */}
              <div className="cl-card p-5 bg-white flex flex-col">
                <div className="mb-3">
                  <h3 className="cl-label text-[#111110] font-semibold">Category Breakdown</h3>
                  <p className="text-[11px] text-[#A19F99]">Spend distribution by tool type</p>
                </div>
                {categoryData.length === 0 ? (
                  <div className="flex-1 flex items-center justify-center text-[#A19F99] text-[12px]">No category data</div>
                ) : (
                  <div className="flex-1 flex flex-col justify-between">
                    <div className="h-[140px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={categoryData}
                            dataKey="value"
                            nameKey="name"
                            cx="50%"
                            cy="50%"
                            innerRadius={42}
                            outerRadius={60}
                            paddingAngle={3}
                          >
                            {categoryData.map((entry, index) => (
                              <Cell
                                key={`cell-${index}`}
                                fill={CATEGORY_COLORS[entry.rawKey] || '#64748B'}
                              />
                            ))}
                          </Pie>
                          <Tooltip
                            contentStyle={{ backgroundColor: '#fff', border: '1px solid #E5E4DF', borderRadius: '8px', fontSize: '11px' }}
                            formatter={(value: any) => [`$${Number(value).toLocaleString()}`, 'Spend']}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="mt-2 grid grid-cols-2 gap-1.5 border-t border-[#F0EFEA] pt-2.5">
                      {categoryData.map((entry) => (
                        <div key={entry.name} className="flex items-center justify-between text-[11px]">
                          <span className="flex items-center gap-1.5 truncate text-[#605F5B]">
                            <span
                              className="w-2 h-2 rounded-full shrink-0"
                              style={{ backgroundColor: CATEGORY_COLORS[entry.rawKey] || '#64748B' }}
                            />
                            {entry.name}
                          </span>
                          <span className="font-mono font-medium text-[#111110] ml-1">
                            ${entry.value.toLocaleString()}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Insight Highlights Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="cl-card p-4 bg-white border-l-4 border-l-[#6D28D9]">
                <div className="flex items-center gap-2 text-[#6D28D9] font-semibold text-[12px] mb-1">
                  <AlertCircle size={14} /> Highest Recent Spend
                </div>
                <p className="text-[13px] text-[#111110] font-medium">
                  ${highestSpendAudit?.totalSpend.toLocaleString() || 0}/mo recorded across {highestSpendAudit?.toolCount || 0} tools
                </p>
                <p className="text-[11px] text-[#A19F99] mt-1">
                  Peak expenditure observed on {highestSpendAudit?.date ? new Date(highestSpendAudit.date).toLocaleDateString() : 'recent audit'}
                </p>
              </div>

              <div className="cl-card p-4 bg-white border-l-4 border-l-[#059669]">
                <div className="flex items-center gap-2 text-[#059669] font-semibold text-[12px] mb-1">
                  <CheckCircle2 size={14} /> Optimization Opportunity
                </div>
                <p className="text-[13px] text-[#111110] font-medium">
                  {savingsRate > 0 ? `${savingsRate.toFixed(1)}% of total monthly spend is recoverable` : 'All tools appear optimally provisioned'}
                </p>
                <p className="text-[11px] text-[#A19F99] mt-1">
                  Implementing recommendations could save ~${totalSavingsFound.toLocaleString()} across your history
                </p>
              </div>

              <div className="cl-card p-4 bg-white border-l-4 border-l-[#3B82F6]">
                <div className="flex items-center gap-2 text-[#3B82F6] font-semibold text-[12px] mb-1">
                  <Activity size={14} /> Latest Top Finding
                </div>
                <p className="text-[13px] text-[#111110] font-medium truncate">
                  {latestAudit?.topFindingTitle || 'No high-priority issues detected'}
                </p>
                <p className="text-[11px] text-[#A19F99] mt-1">
                  Identified in your most recent audit run ({latestDate})
                </p>
              </div>
            </div>

            {/* Recent Audits Table */}
            <div className="cl-card overflow-hidden bg-white">
              <div className="px-5 py-3.5 border-b border-[#F0EFEA] flex items-center justify-between">
                <span className="cl-label font-semibold text-[#111110]">Recent Audit Runs</span>
                <span className="text-[11px] text-[#A19F99]">Showing last {audits.length} runs</span>
              </div>

              <table className="w-full text-[12px]">
                <thead>
                  <tr className="border-b border-[#F0EFEA] bg-[#FAFAF8] text-[#605F5B]">
                    <th className="px-5 py-3 text-left font-semibold">Date</th>
                    <th className="px-5 py-3 text-left font-semibold">Tools Audited</th>
                    <th className="px-5 py-3 text-left font-semibold">Total Monthly Spend</th>
                    <th className="px-5 py-3 text-left font-semibold">Savings Found</th>
                    <th className="px-5 py-3 text-left font-semibold">Top Finding Summary</th>
                    <th className="px-5 py-3 text-right font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {audits.map((a) => (
                    <tr key={a.id} className="border-b border-[#F0EFEA] hover:bg-[#FAFAF8] transition-colors">
                      <td className="px-5 py-3.5 text-[#605F5B]">
                        {new Date(a.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </td>
                      <td className="px-5 py-3.5 text-[#111110] font-medium">{a.toolCount} tools</td>
                      <td className="px-5 py-3.5 text-[#111110] font-mono font-medium">${a.totalSpend.toLocaleString()}</td>
                      <td className="px-5 py-3.5">
                        {a.totalSavings > 0 ? (
                          <span className="text-[#059669] font-mono font-semibold bg-[#D1FAE5] px-2 py-0.5 rounded text-[11px]">
                            ${a.totalSavings.toLocaleString()}/mo
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[#605F5B] bg-[#F4F4F1] px-2 py-0.5 rounded text-[11px] font-medium">
                            <CheckCircle2 size={12} className="text-[#059669]" /> No issues found
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-[#605F5B] max-w-[220px] truncate">
                        {a.topFindingTitle || (a.totalSavings > 0 ? 'Optimization found' : 'Healthy setup')}
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        {a.shareId ? (
                          <Link
                            href={`/audit/${a.shareId}`}
                            className="inline-flex items-center gap-1 font-medium text-[#6D28D9] hover:text-[#5B21B6] hover:underline"
                          >
                            View Report <ExternalLink size={12} />
                          </Link>
                        ) : (
                          <span className="text-[#C8C6C0] text-[11px]">Local run</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        <p className="text-[11px] text-[#C8C6C0] pb-2 text-center">
          Audit history is stored locally in your browser. Running audits across multiple sessions builds out your historical charts automatically.
        </p>
      </div>
    </div>
  );
}

