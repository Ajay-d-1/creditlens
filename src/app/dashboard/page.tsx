import Link from 'next/link';

export default function DashboardPage() {
  return (
    <div className="flex flex-1 items-center justify-center">
      <div className="text-center">
        <h1 className="mb-2 text-2xl font-bold text-white">Dashboard</h1>
        <p className="text-slate-400">Team spend dashboard coming soon.</p>
        <Link
          href="/"
          className="mt-6 inline-block rounded-lg border border-cyan-500/30 bg-cyan-500/10 px-4 py-2 text-sm text-cyan-400 transition-colors hover:bg-cyan-500/20"
        >
          ← Back to Audits
        </Link>
      </div>
    </div>
  );
}
