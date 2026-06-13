'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { LayoutDashboard, TrendingDown, Clock, ExternalLink } from 'lucide-react';

interface StoredAudit {
  id: string;
  date: string;
  toolCount: number;
  totalSpend: number;
  totalSavings: number;
  shareId?: string;
}

export default function DashboardPage() {
  const [audits, setAudits] = useState<StoredAudit[]>([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem('creditlens_audit_history');
      if (raw) setAudits(JSON.parse(raw));
    } catch {}
  }, []);

  const totalSavingsFound = audits.reduce((s, a) => s + a.totalSavings, 0);
  const latestDate = audits[0]?.date
    ? new Date(audits[0].date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : '—';

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Top bar */}
      <div className="flex items-center justify-between px-6 py-3.5 border-b border-[#E5E4DF] bg-white shrink-0">
        <div>
          <h1 className="text-[13px] font-semibold text-[#111110]">Audit History</h1>
          <p className="text-[11px] text-[#A19F99] mt-0.5">Your past audits and savings found</p>
        </div>
        <Link href="/" className="cl-btn-primary text-[12px] py-2 px-4 rounded-lg">
          + New Audit
        </Link>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        {/* Stats row */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          {[
            { label: 'Audits Run', value: audits.length.toString(), icon: LayoutDashboard },
            { label: 'Total Savings Found', value: `$${totalSavingsFound.toLocaleString()}`, icon: TrendingDown },
            { label: 'Latest Audit', value: latestDate, icon: Clock },
          ].map(({ label, value, icon: Icon }) => (
            <div key={label} className="cl-card p-4">
              <div className="cl-label mb-2">{label}</div>
              <div className="text-[20px] font-semibold text-[#111110] font-mono">{value}</div>
            </div>
          ))}
        </div>

        {/* Audits table */}
        <div className="cl-card overflow-hidden">
          <div className="px-4 py-3 border-b border-[#F0EFEA]">
            <span className="cl-label">Recent Audits</span>
          </div>

          {audits.length === 0 ? (
            <div className="py-16 text-center">
              <LayoutDashboard size={24} className="mx-auto text-[#D4D3CE] mb-3" />
              <p className="text-[#A19F99] text-[13px]">No audits yet</p>
              <Link href="/" className="mt-3 inline-block text-[12px] text-[#6D28D9]">
                Run your first audit →
              </Link>
            </div>
          ) : (
            <table className="w-full text-[12px]">
              <thead>
                <tr className="border-b border-[#F0EFEA] bg-[#FAFAF8]">
                  {['Date', 'Tools', 'Total Spend', 'Savings Found', 'Actions'].map(h => (
                    <th key={h} className="cl-label px-4 py-2.5 text-left font-semibold">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {audits.map((a) => (
                  <tr key={a.id} className="border-b border-[#F0EFEA] hover:bg-[#FAFAF8]">
                    <td className="px-4 py-3 text-[#605F5B]">
                      {new Date(a.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </td>
                    <td className="px-4 py-3 text-[#111110] font-medium">{a.toolCount} tools</td>
                    <td className="px-4 py-3 text-[#111110] font-mono">${a.totalSpend.toLocaleString()}</td>
                    <td className="px-4 py-3">
                      <span className="text-[#059669] font-mono font-medium">
                        ${a.totalSavings.toLocaleString()}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {a.shareId && (
                        <Link
                          href={`/audit/${a.shareId}`}
                          className="inline-flex items-center gap-1 text-[#6D28D9] hover:underline"
                        >
                          View <ExternalLink size={11} />
                        </Link>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <p className="text-[11px] text-[#C8C6C0] mt-4 text-center">
          Audit history is stored locally in your browser.
        </p>
      </div>
    </div>
  );
}
