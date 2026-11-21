import { useQuery } from '@tanstack/react-query';
import { BarChart3, Calendar, Clock, IndianRupee } from 'lucide-react';
import { Link } from 'react-router';
import { btn, Crumbs, LiveReload, Notice } from '@/shared';
import { dayLabel, inr, POLL_MS, tone, trail, roleLabel, sapi, signedPct, useApp, useScope } from '../api';
import { Section, Table, Tiles, UserPicker } from '../../common/Pnl';

type Week = { week_start: string; week_end: string; week_number: number; year: number; total_pnl: number; investment_amount: number; percentage_pnl: number; trade_count: number; avg_duration: string };
type Weekly = { today: { amount: number; percentage: number; total_investment: number }; weeks: Week[] };

export function Component() {
  const app = useApp();
  const { root: ROOT } = app;
  const { db, user, users, usersQuery, qs } = useScope();
  const q = useQuery({
    queryKey: ['su', 'weekly', db, user?.user_id],
    queryFn: () => sapi<Weekly>(db, `pnl/weekly?user=${user!.user_id}`),
    enabled: !!user,
    refetchInterval: POLL_MS,
  });
  const weeks = q.data?.weeks ?? [];
  const t = q.data?.today;
  const total = weeks.reduce((s, w) => s + w.total_pnl, 0);
  const avgPct = weeks.length ? weeks.reduce((s, w) => s + w.percentage_pnl, 0) / weeks.length : 0;

  return (
    <>
      <Crumbs
        items={[...trail(app, qs()), { label: `Weekly PnL${weeks.length ? ` (${weeks.length} weeks)` : ''}` }]}
        right={
          <div className="flex items-center gap-3">
            <UserPicker user={user} users={users} label={(u) => `${u.full_name} (${roleLabel(u.role)})`} />
            <LiveReload isFetching={q.isFetching} dataUpdatedAt={q.dataUpdatedAt} onReload={() => q.refetch()} />
          </div>
        }
      />
      <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
        <Calendar className="size-6" /> Weekly PnL Analysis
      </h1>
      {(usersQuery.error || q.error) && <p className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">Error loading PnL data: {(usersQuery.error ?? q.error)!.message}</p>}
      {q.isPending && user && <Notice>Loading weekly PnL data…</Notice>}
      {usersQuery.isSuccess && !users.length && <Notice>No users in {db} yet, so there is no PnL to show.</Notice>}

      {t && (
        <Section title="Today's Performance" icon={<Calendar className="size-5" />}>
          <Tiles
            cols="md:grid-cols-3"
            items={[
              { label: "Today's PnL (₹)", value: <span className={tone(t.amount)}>{inr(t.amount)}</span>, cls: 'bg-violet-50 text-violet-700' },
              { label: "Today's PnL (%)", value: <span className={tone(t.percentage)}>{signedPct(t.percentage)}</span>, cls: 'bg-blue-50 text-blue-700' },
              { label: 'Total Investment', value: inr(t.total_investment), cls: 'bg-emerald-50 text-emerald-700' },
            ]}
          />
        </Section>
      )}

      {q.data && (weeks.length === 0 ? (
        <div className="mt-4">
          <Notice>No weekly PnL data available for this user. Complete some trades to see the weekly history.</Notice>
        </div>
      ) : (
        <Section title="Weekly Trading Performance" icon={<IndianRupee className="size-5" />}>
          <Tiles
            items={[
              { label: 'Total Weeks', value: weeks.length, cls: 'bg-blue-50 text-blue-700' },
              { label: 'Profitable Weeks', value: weeks.filter((w) => w.total_pnl > 0).length, cls: 'bg-emerald-50 text-emerald-700' },
              { label: 'Loss Weeks', value: weeks.filter((w) => w.total_pnl < 0).length, cls: 'bg-red-50 text-red-700' },
              { label: 'Total PnL', value: <span className={tone(total)}>{inr(total)}</span>, cls: 'bg-violet-50 text-violet-700' },
              { label: 'Avg % PnL', value: <span className={tone(avgPct)}>{signedPct(avgPct)}</span>, cls: 'bg-orange-50 text-orange-700' },
              { label: 'Total Invested', value: inr(weeks.reduce((s, w) => s + w.investment_amount, 0)), cls: 'bg-indigo-50 text-indigo-700' },
            ]}
          />
          <Table
            rows={weeks}
            rowKey={(w) => w.week_start}
            cols={[
              { head: 'Week #', cell: (w) => `Week ${w.week_number}`, cls: () => 'font-medium' },
              { head: 'Week Range', cell: (w) => `${dayLabel(w.week_start)} - ${dayLabel(w.week_end)}`, cls: () => 'text-zinc-500' },
              { head: 'PnL (₹)', cell: (w) => inr(w.total_pnl), cls: (w) => `font-medium ${tone(w.total_pnl)}` },
              { head: 'Investment (₹)', cell: (w) => inr(w.investment_amount), cls: () => 'font-medium text-blue-600' },
              { head: '% PnL', cell: (w) => signedPct(w.percentage_pnl), cls: (w) => `font-medium ${tone(w.percentage_pnl)}` },
              { head: 'No. of Trades', cell: (w) => <span className="inline-flex items-center gap-1"><BarChart3 className="size-4 text-blue-600" />{w.trade_count}</span> },
              { head: 'Avg Time Duration', cell: (w) => <span className="inline-flex items-center gap-1"><Clock className="size-4 text-zinc-500" />{w.avg_duration}</span> },
              {
                head: 'Actions',
                cell: (w) => (
                  <Link to={`${ROOT}/pnl/daily${qs({ start: w.week_start, end: w.week_end })}`} className={`${btn.primary} h-8 px-3`}>
                    View Daily
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
