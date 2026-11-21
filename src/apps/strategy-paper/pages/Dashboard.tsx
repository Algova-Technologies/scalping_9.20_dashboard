import { Activity, BarChart3, Calendar, Database, Eraser, FileText, Gauge, IndianRupee, PlugZap, ScrollText, UserRound, type LucideIcon } from 'lucide-react';
import { Link } from 'react-router';
import { card } from '@/shared';
import { KNOWN_LOGS, logTitle, sortCategories, useApp, useLogDates, useScope } from '../api';

const ICONS: Record<string, LucideIcon> = {
  ratelimit: Gauge, account: UserRound, protocol_1_cleaning: Eraser, protocol_2_data_loading: Database,
  protocol_3_trading: Activity, broker_connection: PlugZap,
};

function Tile({ to, title, Icon }: { to: string; title: string; Icon: LucideIcon }) {
  return (
    <Link
      to={to}
      className="group flex min-h-24 items-start gap-4 rounded-lg border border-zinc-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-md focus-visible:ring-2 focus-visible:ring-blue-300 focus-visible:outline-none"
    >
      <span className="rounded-lg bg-blue-50 p-3 text-blue-700 transition-colors group-hover:bg-blue-100">
        <Icon className="size-6" />
      </span>
      <span className="font-semibold">{title}</span>
    </Link>
  );
}

// Trading overview: one card per engine log table (logs_<category> in the database), then the PnL screens.
export function Component() {
  const app = useApp();
  const { root: ROOT, name: NAME, db: DB } = app;
  const { qs } = useScope();
  const dates = useLogDates();
  const categories = sortCategories(dates.data?.categories ?? KNOWN_LOGS.map((k) => k.category)); // known ones until the list loads; none if the database has no log tables
  return (
    <div className="w-full space-y-4">
      <section className={card}>
        <h1 className="text-2xl font-semibold tracking-tight">{NAME}</h1>
        <p className="mt-1 text-sm text-zinc-500">Trading overview · {DB}</p>
      </section>

      <section className={card}>
        <h2 className="mb-3 flex items-center gap-2 text-base font-semibold">
          <ScrollText className="size-5" /> Logs
        </h2>
        {dates.error && <p className="mb-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{dates.error.message}</p>}
        {dates.data && !dates.data.categories.length && (
          <p className="mb-3 rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-700">
            No log tables (logs_*) in <code className="font-mono">{DB}</code> yet. They appear once the engine has written its first logs.
          </p>
        )}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6">
          {categories.map((c) => (
            <Tile key={c} to={`${ROOT}/logs/${c}${qs()}`} title={logTitle(c)} Icon={ICONS[c] ?? FileText} />
          ))}
        </div>
      </section>

      <section className={card}>
        <h2 className="mb-3 flex items-center gap-2 text-base font-semibold">
          <IndianRupee className="size-5" /> Profit &amp; Loss Analysis
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6">
          <Tile to={`${ROOT}/pnl/weekly${qs()}`} title="Weekly PnL & Analysis" Icon={Calendar} />
          <Tile to={`${ROOT}/pnl/open-positions${qs()}`} title="Open Positions" Icon={BarChart3} />
        </div>
      </section>
    </div>
  );
}
