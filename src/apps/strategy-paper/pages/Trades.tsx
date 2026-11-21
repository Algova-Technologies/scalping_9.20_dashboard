import { useQuery } from '@tanstack/react-query';
import { BarChart3, IndianRupee } from 'lucide-react';
import type { ReactNode } from 'react';
import { useSearchParams } from 'react-router';
import { Crumbs, LiveReload, Notice } from '@/shared';
import { Section, Tiles, UserPicker } from '../../common/Pnl';
import { clock, dayLabel, humanDuration, inr, papi, POLL_MS, signedPct, tone, trail, useApp, userLabel, useScope } from '../api';
import { summaryTiles, type Summary } from './DailyPnL';

type Trade = { trade_id: number; symbol: string; strike_price: string; entry_time: string | null; exit_time: string; entry_qty: number; exit_qty: number; entry_price: number; exit_price: number; total_pnl: number; percentage_pnl: number; duration: string };

// Rows are fields, columns are trades (Trade 1, Trade 2, …), as in the old paper screen (live alike).
const FIELDS: { label: string; cell: (t: Trade) => ReactNode; cls?: (t: Trade) => string }[] = [
  { label: 'Symbol', cell: (t) => t.symbol || '—', cls: () => 'font-medium' },
  { label: 'Strike', cell: (t) => t.strike_price || '—' },
  { label: 'Entry Time', cell: (t) => clock(t.entry_time), cls: () => 'text-emerald-600' },
  { label: 'Entry Qty', cell: (t) => t.entry_qty.toLocaleString('en-IN'), cls: () => 'font-medium text-blue-600' },
  { label: 'Entry Price', cell: (t) => `₹${t.entry_price.toFixed(2)}`, cls: () => 'font-medium' },
  { label: 'Exit Time', cell: (t) => clock(t.exit_time), cls: () => 'text-red-600' },
  { label: 'Exit Qty', cell: (t) => t.exit_qty.toLocaleString('en-IN'), cls: () => 'font-medium text-violet-600' },
  { label: 'Exit Price', cell: (t) => `₹${t.exit_price.toFixed(2)}`, cls: () => 'font-medium' },
  { label: 'Total PnL (₹)', cell: (t) => inr(t.total_pnl), cls: (t) => `font-semibold ${tone(t.total_pnl)}` },
  { label: '% PnL', cell: (t) => signedPct(t.percentage_pnl), cls: (t) => `font-semibold ${tone(t.percentage_pnl)}` },
  { label: 'Duration', cell: (t) => humanDuration(t.duration) },
];

// Every trade that exited on ?day= (latest exit first), inside the week ?start=&end= it was opened from.
export function Component() {
  const app = useApp();
  const { root: ROOT } = app;
  const { user, users, qs } = useScope();
  const [sp] = useSearchParams();
  const [start, end, day] = ['start', 'end', 'day'].map((k) => sp.get(k) ?? '');
  const q = useQuery({
    queryKey: [app.api, 'trades', user?.user_id, day],
    queryFn: () => papi<Summary & { trades: Trade[] }>(app, `pnl/trades?${new URLSearchParams({ user: String(user!.user_id), date: day })}`),
    enabled: !!user && !!day,
    refetchInterval: POLL_MS,
  });
  const trades = q.data?.trades ?? [];
  return (
    <>
      <Crumbs
        items={[
          ...trail(app, qs()),
          { label: 'Weekly PnL', to: `${ROOT}/pnl/weekly${qs()}` },
          ...(start ? [{ label: `${dayLabel(start)} - ${dayLabel(end)}`, to: `${ROOT}/pnl/daily${qs({ start, end })}` }] : []),
          { label: day ? `${dayLabel(day)} · Trades (${trades.length})` : 'Trades' },
        ]}
        right={<div className="flex flex-wrap items-center gap-3"><UserPicker user={user} users={users} label={userLabel(app)} /><LiveReload isFetching={q.isFetching} dataUpdatedAt={q.dataUpdatedAt} onReload={() => q.refetch()} /></div>}
      />
      <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight"><BarChart3 className="size-6" /> Individual Trades</h1>
      {!day && <div className="mt-4"><Notice>Pick a day from the Daily PnL screen.</Notice></div>}
      {q.error && <p className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">Error loading trades data: {q.error.message}</p>}
      {q.data && (trades.length === 0 ? (
        <div className="mt-4"><Notice>No trades found for {dayLabel(day)}: no trades were completed on this date.</Notice></div>
      ) : (
        <Section title={`Individual Trades for ${dayLabel(day)}`} icon={<IndianRupee className="size-5" />}>
          <Tiles cols="lg:grid-cols-4 2xl:grid-cols-7" items={summaryTiles('Trades', trades.length, trades.filter((t) => t.total_pnl > 0).length, trades.filter((t) => t.total_pnl < 0).length, q.data).map((t) => (t.label === 'Trading Trades' ? { ...t, label: 'Total Trades' } : t))} />
          <div className="mt-5 w-fit max-w-full overflow-x-auto rounded-lg border border-zinc-200">
            <table className="text-sm whitespace-nowrap">
              <thead className="bg-zinc-50">
                <tr className="divide-x divide-zinc-200">
                  <th className="sticky left-0 z-10 bg-zinc-50 px-4 py-3 text-left text-xs font-medium tracking-wide text-zinc-500 uppercase">Field</th>
                  {trades.map((t, i) => <th key={t.trade_id} className="px-4 py-3 text-left font-semibold">Trade {i + 1}</th>)}
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200">
                {FIELDS.map((f, r) => (
                  <tr key={f.label} className={`divide-x divide-zinc-200 hover:bg-blue-50 ${r % 2 ? 'bg-zinc-50' : 'bg-white'}`}>
                    <th scope="row" className={`sticky left-0 z-10 px-4 py-2.5 text-left font-medium text-zinc-600 ${r % 2 ? 'bg-zinc-50' : 'bg-white'}`}>{f.label}</th>
                    {trades.map((t) => <td key={t.trade_id} className={`px-4 py-2.5 tabular-nums ${f.cls?.(t) ?? ''}`}>{f.cell(t)}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>
      ))}
    </>
  );
}
