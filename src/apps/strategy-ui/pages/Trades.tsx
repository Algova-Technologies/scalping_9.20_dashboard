import { useQuery } from '@tanstack/react-query';
import { Calendar, Clock, IndianRupee } from 'lucide-react';
import { useSearchParams } from 'react-router';
import { Crumbs, LiveReload, Notice } from '@/shared';
import { clock, dayLabel, inr, POLL_MS, tone, trail, roleLabel, sapi, signedPct, useApp, useScope } from '../api';
import { Section, Table, Tiles, UserPicker } from '../../common/Pnl';
import type { Summary } from './DailyPnL';

type Trade = { trade_id: number; symbol: string; option_type: string; strike_price: string; entry_time: string | null; exit_time: string; entry_qty: number; exit_qty: number; entry_price: number; exit_price: number; total_pnl: number; percentage_pnl: number; duration: string };

// Every trade that exited on ?day=, inside the week ?start=&end= it was opened from.
export function Component() {
  const app = useApp();
  const { root: ROOT } = app;
  const { db, user, users, qs } = useScope();
  const [sp] = useSearchParams();
  const [start, end, day] = ['start', 'end', 'day'].map((k) => sp.get(k) ?? '');
  const q = useQuery({
    queryKey: ['su', 'trades', db, user?.user_id, day],
    queryFn: () => sapi<Summary & { trades: Trade[] }>(db, `pnl/trades?${new URLSearchParams({ user: String(user!.user_id), date: day })}`),
    enabled: !!user && !!day,
    refetchInterval: POLL_MS,
  });
  const trades = q.data?.trades ?? [];
  const s = q.data;
  const base = `${ROOT}/pnl`;

  return (
    <>
      <Crumbs
        items={[
          ...trail(app, qs()),
          { label: 'Weekly PnL', to: `${base}/weekly${qs()}` },
          ...(start ? [{ label: `${dayLabel(start)} - ${dayLabel(end)}`, to: `${base}/daily${qs({ start, end })}` }] : []),
          { label: day ? `${dayLabel(day)} · Trades (${trades.length})` : 'Trades' },
        ]}
        right={
          <div className="flex items-center gap-3">
            <UserPicker user={user} users={users} label={(u) => `${u.full_name} (${roleLabel(u.role)})`} />
            <LiveReload isFetching={q.isFetching} dataUpdatedAt={q.dataUpdatedAt} onReload={() => q.refetch()} />
          </div>
        }
      />
      <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
        <Calendar className="size-6" /> Trades Analysis
      </h1>
      {!day && <Notice>Pick a day from the Daily PnL screen.</Notice>}
      {q.error && <p className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">Error loading trades data: {q.error.message}</p>}
      {s && (trades.length === 0 ? (
        <div className="mt-4">
          <Notice>No trades found for {dayLabel(day)}: no trades were completed on this date.</Notice>
        </div>
      ) : (
        <Section title={`Individual Trades for ${dayLabel(day)}`} icon={<IndianRupee className="size-5" />}>
          <Tiles
            items={[
              { label: 'Total Trades', value: trades.length, cls: 'bg-blue-50 text-blue-700' },
              { label: 'Profitable Trades', value: trades.filter((t) => t.total_pnl > 0).length, cls: 'bg-emerald-50 text-emerald-700' },
              { label: 'Loss Trades', value: trades.filter((t) => t.total_pnl < 0).length, cls: 'bg-red-50 text-red-700' },
              { label: 'Total PnL', value: <span className={tone(s.total_pnl)}>{inr(s.total_pnl)}</span>, cls: 'bg-violet-50 text-violet-700' },
              { label: '% PnL', value: <span className={tone(s.percentage_pnl)}>{signedPct(s.percentage_pnl)}</span>, cls: 'bg-orange-50 text-orange-700' },
              { label: 'Total Invested Amount', value: inr(s.total_invested_amount), cls: 'bg-indigo-50 text-indigo-700' },
            ]}
          />
          <Table
            rows={trades}
            rowKey={(t) => t.trade_id}
            cols={[
              { head: 'Symbol', cell: (t) => <><div className="font-medium">{t.symbol}</div><div className="text-xs text-zinc-500">{t.option_type}</div></> },
              { head: 'Entry Time', cell: (t) => <span className="inline-flex items-center gap-1"><Clock className="size-4 text-emerald-600" />{clock(t.entry_time)}</span> },
              { head: 'Entry Strike', cell: (t) => t.strike_price },
              { head: 'Entry Qty', cell: (t) => t.entry_qty.toLocaleString('en-IN'), cls: () => 'font-medium text-blue-600' },
              { head: 'Entry Price', cell: (t) => `₹${t.entry_price.toFixed(2)}`, cls: () => 'font-medium' },
              { head: 'Exit Time', cell: (t) => <span className="inline-flex items-center gap-1"><Clock className="size-4 text-red-600" />{clock(t.exit_time)}</span> },
              { head: 'Exit Strike', cell: (t) => t.strike_price },
              { head: 'Exit Qty', cell: (t) => t.exit_qty.toLocaleString('en-IN'), cls: () => 'font-medium text-violet-600' },
              { head: 'Exit Price', cell: (t) => `₹${t.exit_price.toFixed(2)}`, cls: () => 'font-medium' },
              { head: 'Total PnL (₹)', cell: (t) => inr(t.total_pnl), cls: (t) => `font-medium ${tone(t.total_pnl)}` },
              { head: '% PnL', cell: (t) => signedPct(t.percentage_pnl), cls: (t) => `font-medium ${tone(t.percentage_pnl)}` },
              { head: 'Duration', cell: (t) => <span className="inline-flex items-center gap-1"><Clock className="size-4 text-zinc-500" />{t.duration}</span> },
            ]}
          />
          <p className="mt-3 text-right text-sm text-zinc-500">Average duration: {s.avg_duration}</p>
        </Section>
      ))}
    </>
  );
}
