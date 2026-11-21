import { useQuery } from '@tanstack/react-query';
import { BarChart3, Calendar, IndianRupee } from 'lucide-react';
import { Link } from 'react-router';
import { btn, Crumbs, LiveReload, Notice } from '@/shared';
import { Section, Table, Tiles, UserPicker } from '../../common/Pnl';
import { dayLabel, humanDuration, inr, papi, POLL_MS, signedPct, tone, trail, useApp, userLabel, useScope } from '../api';

export type Week = { week_start: string; week_end: string; week_number: number; total_pnl: number; investment_amount: number; percentage_pnl: number; trade_count: number; avg_duration: string };

export function Component() {
  const app = useApp();
  const { root: ROOT } = app;
  const { user, users, usersQuery, qs } = useScope();
  const q = useQuery({
    queryKey: [app.api, 'weekly', user?.user_id],
    queryFn: () => papi<{ weeks: Week[] }>(app, `pnl/weekly?user=${user!.user_id}`),
    enabled: !!user,
    refetchInterval: POLL_MS,
  });
  const weeks = q.data?.weeks ?? [];
  const total = weeks.reduce((s, w) => s + w.total_pnl, 0);
  const avgPct = weeks.length ? weeks.reduce((s, w) => s + w.percentage_pnl, 0) / weeks.length : 0;
  return (
    <>
      <Crumbs
        items={[...trail(app, qs()), { label: `Weekly PnL${weeks.length ? ` (${weeks.length} weeks)` : ''}` }]}
        right={<div className="flex flex-wrap items-center gap-3"><UserPicker user={user} users={users} label={userLabel(app)} /><LiveReload isFetching={q.isFetching} dataUpdatedAt={q.dataUpdatedAt} onReload={() => q.refetch()} /></div>}
      />
      <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight"><Calendar className="size-6" /> Weekly PnL Analysis</h1>
      {(usersQuery.error || q.error) && <p className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">Error loading PnL data: {(usersQuery.error ?? q.error)!.message}</p>}
      {usersQuery.data && !user && <div className="mt-4"><Notice>No users in this project yet.</Notice></div>}
      {q.data && (weeks.length === 0 ? (
        <div className="mt-4"><Notice>No weekly PnL data available for this user. Complete some trades to see the weekly history.</Notice></div>
      ) : (
        <Section title="Weekly Trading Performance" icon={<IndianRupee className="size-5" />}>
          <Tiles items={[
            { label: 'Total Weeks', value: weeks.length, cls: 'bg-blue-50 text-blue-700' },
            { label: 'Profitable Weeks', value: weeks.filter((w) => w.total_pnl > 0).length, cls: 'bg-emerald-50 text-emerald-700' },
            { label: 'Loss Weeks', value: weeks.filter((w) => w.total_pnl < 0).length, cls: 'bg-red-50 text-red-700' },
            { label: 'Total PnL', value: <span className={tone(total)}>{inr(total)}</span>, cls: 'bg-violet-50 text-violet-700' },
            { label: 'Avg % PnL', value: <span className={tone(avgPct)}>{signedPct(avgPct)}</span>, cls: 'bg-orange-50 text-orange-700' },
            { label: 'Total Invested', value: inr(weeks.reduce((s, w) => s + w.investment_amount, 0)), cls: 'bg-indigo-50 text-indigo-700' },
          ]} />
          <Table rows={weeks} rowKey={(w) => w.week_start} cols={[
            { head: 'Week #', cell: (w) => `Week ${w.week_number}`, cls: () => 'font-medium' },
            { head: 'Week Range', cell: (w) => `${dayLabel(w.week_start)} - ${dayLabel(w.week_end)}`, cls: () => 'text-zinc-500' },
            { head: 'PnL (₹)', cell: (w) => inr(w.total_pnl), cls: (w) => `font-medium ${tone(w.total_pnl)}` },
            { head: 'Investment (₹)', cell: (w) => inr(w.investment_amount), cls: () => 'font-medium text-blue-600' },
            { head: '% PnL', cell: (w) => signedPct(w.percentage_pnl), cls: (w) => `font-medium ${tone(w.percentage_pnl)}` },
            { head: 'No. of Trades', cell: (w) => <span className="inline-flex items-center gap-1"><BarChart3 className="size-4 text-blue-600" />{w.trade_count}</span> },
            { head: 'Avg Time Duration', cell: (w) => humanDuration(w.avg_duration) },
            { head: 'Actions', cell: (w) => <Link to={`${ROOT}/pnl/daily${qs({ start: w.week_start, end: w.week_end })}`} className={`${btn.primary} h-8 px-3`}>View Daily</Link> },
          ]} />
        </Section>
      ))}
    </>
  );
}
