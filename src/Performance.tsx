import { ChartColumn, Clock, IndianRupee } from 'lucide-react';
import type { ReactNode } from 'react';
import { addDays, days, isoWeek, monday, parse, sum, type Trade, weeks, ymd } from './metrics';
import { fmt, tone } from './projects';

// Tables for one variant's trades. All grouping maths lives in metrics.ts (tested).
const show = (d: Date) => d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
const inr = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format;
const hms = (s: number) => {
  const t = Math.round(s);
  return `${pad(Math.floor(t / 3600))}:${pad(Math.floor(t / 60) % 60)}:${pad(t % 60)}`;
};
const pad = (n: number) => String(n).padStart(2, '0');
const clock = (s: number) => {
  const t = Math.round(s);
  const h = Math.floor(t / 3600) % 24;
  return `${pad(h % 12 || 12)}:${pad(Math.floor(t / 60) % 60)}:${pad(t % 60)} ${h < 12 ? 'AM' : 'PM'}`;
};
const tPnl = (t: Trade) => t.pnl;
const tInvested = (t: Trade) => t.invested;

// ---- shared UI ----
const actionBtn = 'rounded-md bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-700';

type Stat = { label: string; value: string; cls: string };
type Col<T> = { head: string; cell: (r: T) => ReactNode; cls?: (r: T) => string };

// One column list renders two ways, so nothing ever scrolls sideways:
// a wrapping table on wide screens (xl+), stacked label/value cards below that.
function Section<T>(props: { title: string; stats: Stat[]; cols: Col<T>[]; rows: T[]; rowKey: (r: T) => string; empty: string }) {
  const { title, stats, cols, rows, rowKey, empty } = props;
  return (
    <section className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
      <h2 className="flex items-center gap-2 text-base font-semibold">
        <IndianRupee className="size-4" /> {title}
      </h2>

      <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        {stats.map((s) => (
          <div key={s.label} className={`rounded-lg px-4 py-4 text-center ${s.cls}`}>
            <div className="text-base font-bold break-words tabular-nums md:text-lg">{s.value}</div>
            <div className="mt-0.5 text-xs">{s.label}</div>
          </div>
        ))}
      </div>

      {rows.length === 0 ? (
        <p className="mt-5 rounded-lg border border-zinc-200 px-4 py-8 text-center text-sm text-zinc-400">{empty}</p>
      ) : (
        <>
          <div className="mt-5 hidden overflow-hidden rounded-lg border border-zinc-200 xl:block">
            <table className="w-full text-center text-sm">
              <thead className="border-b border-zinc-200 bg-zinc-50">
                <tr className="divide-x divide-zinc-200">
                  {cols.map((c) => (
                    <th key={c.head} className="px-2 py-3 text-xs font-medium tracking-wider text-zinc-500 uppercase">
                      {c.head}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200">
                {rows.map((r) => (
                  <tr key={rowKey(r)} className="divide-x divide-zinc-200 hover:bg-zinc-50">
                    {cols.map((c) => (
                      <td key={c.head} className={`px-2 py-3 break-words tabular-nums ${c.cls?.(r) ?? ''}`}>
                        {c.cell(r)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-2 xl:hidden">
            {rows.map((r) => (
              <dl key={rowKey(r)} className="grid grid-cols-2 gap-x-4 gap-y-2 rounded-lg border border-zinc-200 p-4 text-sm">
                {cols.map((c) => (
                  <div key={c.head} className="contents">
                    <dt className="text-xs font-medium tracking-wider text-zinc-500 uppercase">{c.head}</dt>
                    <dd className={`min-w-0 text-right break-words tabular-nums ${c.cls?.(r) ?? ''}`}>{c.cell(r)}</dd>
                  </div>
                ))}
              </dl>
            ))}
          </div>
        </>
      )}
    </section>
  );
}

const Trades = ({ n }: { n: number }) => (
  <span className="inline-flex items-center gap-1.5">
    <ChartColumn className="size-4 text-indigo-600" /> {n}
  </span>
);
const Duration = ({ s }: { s: number }) => (
  <span className="inline-flex items-center gap-1.5">
    <Clock className="size-4 text-zinc-500" /> {hms(s)}
  </span>
);
const At = ({ s, cls }: { s: number; cls: string }) => (
  <span className="inline-flex items-center gap-1.5">
    <Clock className={`size-4 shrink-0 ${cls}`} /> {clock(s)}
  </span>
);

const countStats = (unit: string, rows: { pnl: number }[]): Stat[] => [
  { label: `Total ${unit}`, value: String(rows.length), cls: 'bg-blue-50 text-blue-700' },
  { label: `Profitable ${unit}`, value: String(rows.filter((r) => r.pnl > 0).length), cls: 'bg-emerald-50 text-emerald-700' },
  { label: `Loss ${unit}`, value: String(rows.filter((r) => r.pnl < 0).length), cls: 'bg-red-50 text-red-600' },
];
const moneyStats = (pnl: number, pctLabel: string, pct: number, invLabel: string, invested: number): Stat[] => [
  { label: 'Total PnL', value: inr(pnl), cls: `bg-fuchsia-50 ${tone(pnl)}` },
  { label: pctLabel, value: fmt(pct), cls: `bg-orange-50 ${tone(pct)}` },
  { label: invLabel, value: inr(invested), cls: 'bg-indigo-50 text-indigo-700' },
];

// ---- weekly ----
export const dayLabel = (d: string) => show(parse(d));

export function weekLabel(key: string) {
  return `Week ${isoWeek(parse(key))}`;
}

export function WeeklyPerformance({ trades, onViewDaily }: { trades: Trade[]; onViewDaily: (weekKey: string) => void }) {
  const rows = weeks(trades);
  type R = (typeof rows)[number];
  const avgPct = sum(rows, (r) => r.pct) / (rows.length || 1);
  const stats = [...countStats('Weeks', rows), ...moneyStats(sum(rows, (r) => r.pnl), 'Avg % PnL', avgPct, 'Total Invested', sum(rows, (r) => r.invested))];
  const cols: Col<R>[] = [
    { head: 'Week #', cell: (r) => weekLabel(r.key), cls: () => 'font-semibold' },
    { head: 'Week Range', cell: (r) => `${show(r.start)} - ${show(addDays(r.start, 4))}`, cls: () => 'text-zinc-500' },
    { head: 'PnL (₹)', cell: (r) => inr(r.pnl), cls: (r) => `font-medium ${tone(r.pnl)}` },
    { head: 'Total PnL (₹)', cell: (r) => inr(r.total), cls: (r) => `font-medium ${tone(r.total)}` },
    { head: 'Investment (₹)', cell: (r) => inr(r.invested), cls: () => 'font-medium text-indigo-700' },
    { head: '% PnL', cell: (r) => fmt(r.pct), cls: (r) => `font-medium ${tone(r.pct)}` },
    { head: 'No. of Trades', cell: (r) => <Trades n={r.trades} /> },
    { head: 'Avg Time Duration', cell: (r) => <Duration s={r.avgSec} /> },
    {
      head: 'Actions',
      cell: (r) => (
        <button className={actionBtn} onClick={() => onViewDaily(r.key)}>
          View Daily
        </button>
      ),
    },
  ];
  return <Section title="Weekly Trading Performance" stats={stats} cols={cols} rows={rows} rowKey={(r) => r.key} empty="No trading weeks yet." />;
}

// ---- daily ----
export function DailyPerformance({ trades, weekKey, onViewTrades }: { trades: Trade[]; weekKey: string; onViewTrades: (day: string) => void }) {
  const rows = days(trades).filter((d) => ymd(monday(parse(d.date))) === weekKey).reverse(); // newest first
  type R = (typeof rows)[number];
  const pnl = sum(rows, (r) => r.pnl);
  const invested = sum(rows, (r) => r.invested);
  const stats = [
    ...countStats('Days', rows).map((s, i) => (i === 0 ? { ...s, label: 'Trading Days' } : s)),
    ...moneyStats(pnl, '% PnL', invested ? (pnl / invested) * 100 : 0, 'Total Invested Amount', invested),
  ];
  const pct = (r: R) => (r.pnl / r.invested) * 100;
  const cols: Col<R>[] = [
    { head: 'Date', cell: (r) => dayLabel(r.date), cls: () => 'font-semibold' },
    { head: 'No. of Trades', cell: (r) => <Trades n={r.trades} /> },
    { head: 'Entry Strike', cell: (r) => r.entryStrike },
    { head: 'Entry Qty', cell: (r) => r.entryQty, cls: () => 'font-medium text-indigo-600' },
    { head: 'Exit Strike', cell: (r) => r.exitStrike },
    { head: 'Exit Qty', cell: (r) => r.exitQty, cls: () => 'font-medium text-fuchsia-600' },
    { head: 'Total PnL (₹)', cell: (r) => inr(r.pnl), cls: (r) => `font-medium ${tone(r.pnl)}` },
    { head: '% PnL', cell: (r) => fmt(pct(r)), cls: (r) => `font-medium ${tone(pct(r))}` },
    { head: 'Avg Time Duration', cell: (r) => <Duration s={r.avgSec} /> },
    {
      head: 'Actions',
      cell: (r) => (
        <button className={actionBtn} onClick={() => onViewTrades(r.date)}>
          View Trades
        </button>
      ),
    },
  ];
  return <Section title="Daily Trading Performance" stats={stats} cols={cols} rows={rows} rowKey={(r) => r.date} empty="No trading days in this week." />;
}

// ---- individual trades ----
export function TradesPerformance({ trades: all, day }: { trades: Trade[]; day: string }) {
  const rows = all.filter((t) => t.date === day).sort((a, b) => a.entrySec - b.entrySec);
  const pnl = sum(rows, tPnl);
  const invested = sum(rows, tInvested);
  const stats = [
    ...countStats('Trades', rows.map((t) => ({ pnl: tPnl(t) }))),
    ...moneyStats(pnl, '% PnL', invested ? (pnl / invested) * 100 : 0, 'Total Invested Amount', invested),
  ];
  const pct = (t: Trade) => (tPnl(t) / tInvested(t)) * 100;
  const cols: Col<Trade>[] = [
    {
      head: 'Symbol',
      cell: (t) => (
        <>
          <div className="text-xs font-semibold break-all">{t.symbol}</div>
          <div className="text-xs text-zinc-500">{t.type}</div>
        </>
      ),
    },
    { head: 'Entry Time', cell: (t) => <At s={t.entrySec} cls="text-emerald-600" /> },
    { head: 'Entry Strike', cell: (t) => t.strike },
    { head: 'Entry Qty', cell: (t) => t.qty, cls: () => 'font-medium text-indigo-600' },
    { head: 'Entry Price', cell: (t) => inr(t.entryPrice), cls: () => 'font-semibold' },
    { head: 'Exit Time', cell: (t) => <At s={t.entrySec + t.durSec} cls="text-red-600" /> },
    { head: 'Exit Strike', cell: (t) => t.strike },
    { head: 'Exit Qty', cell: (t) => t.exitQty, cls: () => 'font-medium text-fuchsia-600' },
    { head: 'Exit Price', cell: (t) => inr(t.exitPrice), cls: () => 'font-semibold' },
    { head: 'Total PnL (₹)', cell: (t) => inr(tPnl(t)), cls: (t) => `font-medium ${tone(tPnl(t))}` },
    { head: '% PnL', cell: (t) => fmt(pct(t)), cls: (t) => `font-medium ${tone(pct(t))}` },
    { head: 'Avg Time Duration', cell: (t) => <Duration s={t.durSec} /> },
  ];
  return <Section title={`Individual Trades for ${dayLabel(day)}`} stats={stats} cols={cols} rows={rows} rowKey={(t) => t.id} empty="No trades on this day." />;
}

export { inr, hms, clock };
