import { useQuery } from '@tanstack/react-query';
import { BarChart3, Calendar, Clock, IndianRupee } from 'lucide-react';
import { Link, useSearchParams } from 'react-router';
import { btn, Crumbs, LiveReload, Notice } from '@/shared';
import { dayLabel, inr, POLL_MS, tone, trail, roleLabel, sapi, signedPct, useApp, useScope } from '../api';
import { Section, Table, Tiles, UserPicker } from '../../common/Pnl';

type Day = { trade_date: string; no_of_trades: number; buy_qty: number; sell_qty: number; entry_strike_price: string; exit_strike_price: string; total_pnl: number; percentage_pnl: number; avg_duration: string };
export type Summary = { total_pnl: number; total_invested_amount: number; percentage_pnl: number; avg_duration: string };

// One week (?start=&end=, Monday-Friday) day by day.
export function Component() {
  const app = useApp();
  const { root: ROOT } = app;
  const { db, user, users, qs } = useScope();
  const [sp] = useSearchParams();
  const start = sp.get('start') ?? '';
  const end = sp.get('end') ?? '';
  const q = useQuery({
    queryKey: ['su', 'daily', db, user?.user_id, start, end],
    queryFn: () => sapi<Summary & { daily_data: Day[] }>(db, `pnl/daily?${new URLSearchParams({ user: String(user!.user_id), start, end })}`),
    enabled: !!user && !!start && !!end,
    refetchInterval: POLL_MS,
  });
  const days = q.data?.daily_data ?? [];
  const s = q.data;
  const base = `${ROOT}/pnl`;

  return (
    <>
      <Crumbs
        items={[...trail(app, qs()), { label: 'Weekly PnL', to: `${base}/weekly${qs()}` }, { label: start ? `${dayLabel(start)} - ${dayLabel(end)}` : 'Daily PnL' }]}
        right={
          <div className="flex items-center gap-3">
            <UserPicker user={user} users={users} label={(u) => `${u.full_name} (${roleLabel(u.role)})`} />
            <LiveReload isFetching={q.isFetching} dataUpdatedAt={q.dataUpdatedAt} onReload={() => q.refetch()} />
          </div>
        }
      />
      <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
        <Calendar className="size-6" /> Daily PnL Analysis
      </h1>
      {!start && <Notice>Pick a week from the Weekly PnL screen.</Notice>}
      {q.error && <p className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">Error loading PnL data: {q.error.message}</p>}
      {s && (days.length === 0 ? (
        <div className="mt-4">
          <Notice>No daily PnL data available for this week: no trades were completed during this period.</Notice>
        </div>
      ) : (
        <Section title="Daily Trading Performance" icon={<IndianRupee className="size-5" />}>
          <Tiles
            items={[
              { label: 'Trading Days', value: days.length, cls: 'bg-blue-50 text-blue-700' },
              { label: 'Profitable Days', value: days.filter((d) => d.total_pnl > 0).length, cls: 'bg-emerald-50 text-emerald-700' },
              { label: 'Loss Days', value: days.filter((d) => d.total_pnl < 0).length, cls: 'bg-red-50 text-red-700' },
              { label: 'Total PnL', value: <span className={tone(s.total_pnl)}>{inr(s.total_pnl)}</span>, cls: 'bg-violet-50 text-violet-700' },
              { label: '% PnL', value: <span className={tone(s.percentage_pnl)}>{signedPct(s.percentage_pnl)}</span>, cls: 'bg-orange-50 text-orange-700' },
              { label: 'Total Invested Amount', value: inr(s.total_invested_amount), cls: 'bg-indigo-50 text-indigo-700' },
            ]}
          />
          <Table
            rows={days}
            rowKey={(d) => d.trade_date}
            cols={[
              { head: 'Date', cell: (d) => dayLabel(d.trade_date), cls: () => 'font-medium' },
              { head: 'No. of Trades', cell: (d) => <span className="inline-flex items-center gap-1"><BarChart3 className="size-4 text-blue-600" />{d.no_of_trades}</span> },
              { head: 'Entry Strike', cell: (d) => d.entry_strike_price },
              { head: 'Entry Qty', cell: (d) => d.buy_qty.toLocaleString('en-IN'), cls: () => 'font-medium text-blue-600' },
              { head: 'Exit Strike', cell: (d) => d.exit_strike_price },
              { head: 'Exit Qty', cell: (d) => d.sell_qty.toLocaleString('en-IN'), cls: () => 'font-medium text-violet-600' },
              { head: 'Total PnL (₹)', cell: (d) => inr(d.total_pnl), cls: (d) => `font-medium ${tone(d.total_pnl)}` },
              { head: '% PnL', cell: (d) => signedPct(d.percentage_pnl), cls: (d) => `font-medium ${tone(d.percentage_pnl)}` },
              { head: 'Avg Time Duration', cell: (d) => <span className="inline-flex items-center gap-1"><Clock className="size-4 text-zinc-500" />{d.avg_duration}</span> },
              {
                head: 'Actions',
                cell: (d) => (
                  <Link to={`${base}/trades${qs({ start, end, day: d.trade_date })}`} className={`${btn.primary} h-8 px-3`}>
                    View Trades
                  </Link>
                ),
              },
            ]}
          />
        </Section>
      ))}
    </>
  );
}
