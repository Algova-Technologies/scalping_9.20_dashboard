import { useQuery } from '@tanstack/react-query';
import { BarChart3, Clock } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Crumbs, LiveReload, Notice } from '@/shared';
import { hms } from '../../common/format';
import { Table, Tiles, UserPicker } from '../../common/Pnl';
import { clock, dayLabel, humanDuration, inr, papi, POLL_MS, trail, useApp, userLabel, useScope } from '../api';

type Leg = { id: number; symbol: string; strike_price: string; side: string; date_time: string | null; price: number; quantity: number; order_status: string };
type Data = { total_open_positions: number; total_investment_amount: number; positions: Leg[]; now: string };

const wall = (s: string) => new Date(s.replace(' ', 'T')).getTime(); // naive IST strings: same zone on both sides

// The user's live (not yet archived) order legs, with how long each has been open, plus the open-position KPIs.
export function Component() {
  const app = useApp();
  const { user, users, qs } = useScope();
  const q = useQuery({
    queryKey: [app.api, 'open', user?.user_id],
    queryFn: () => papi<Data>(app, `pnl/open-positions?user=${user!.user_id}`),
    enabled: !!user,
    refetchInterval: POLL_MS,
  });
  // Live duration ticks every second between polls, from the server's clock at the last poll.
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setTick((n) => n + 1), 1000);
    return () => clearInterval(t);
  }, []);
  useEffect(() => setTick(0), [q.dataUpdatedAt]);
  const d = q.data;
  const legs = d?.positions ?? [];
  const nowMs = d ? wall(d.now) + tick * 1000 : 0;
  return (
    <>
      <Crumbs
        items={[...trail(app, qs()), { label: `Open Positions (${legs.length})` }]}
        right={<div className="flex flex-wrap items-center gap-3"><UserPicker user={user} users={users} label={userLabel(app)} /><LiveReload isFetching={q.isFetching} dataUpdatedAt={q.dataUpdatedAt} onReload={() => q.refetch()} /></div>}
      />
      <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight"><BarChart3 className="size-6" /> Open Positions</h1>
      {q.error && !d && <p className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">Error loading open positions: {q.error.message}</p>}
      {d && (
        <section className="mt-4 rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
          <Tiles cols="md:grid-cols-2 lg:grid-cols-2" items={[
            { label: 'Total Open Positions', value: d.total_open_positions, cls: 'bg-blue-50 text-blue-700' },
            { label: 'Total Investment Amount', value: inr(d.total_investment_amount), cls: 'bg-indigo-50 text-indigo-700' },
          ]} />
          {legs.length === 0 ? (
            <div className="mt-5"><Notice>No live trade records found: there are no records for this user in the live trade table.</Notice></div>
          ) : (
            <Table rows={legs} rowKey={(l) => l.id} cols={[
              { head: 'Symbol', cell: (l) => <><div className="font-medium">{l.symbol || '—'}</div><div className="text-xs text-zinc-500">{l.side}</div></> },
              { head: 'Entry Time', cell: (l) => <span className="inline-flex items-center gap-1"><Clock className="size-4 text-emerald-600" />{clock(l.date_time)}</span> },
              { head: 'Entry Strike', cell: (l) => l.strike_price || '—' },
              { head: 'Entry Qty', cell: (l) => l.quantity.toLocaleString('en-IN'), cls: () => 'font-medium text-blue-600' },
              { head: 'Entry Price', cell: (l) => inr(l.price) },
              { head: 'Date', cell: (l) => (l.date_time ? dayLabel(l.date_time.slice(0, 10)) : '—') },
              { head: 'Order Status', cell: (l) => <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${l.order_status.toLowerCase() === 'complete' ? 'bg-emerald-50 text-emerald-700' : 'bg-zinc-100 text-zinc-600'}`}>{l.order_status || 'Unknown'}</span> },
              { head: 'Live Duration', cell: (l) => (l.date_time ? humanDuration(hms((nowMs - wall(l.date_time)) / 1000)) : '—') },
            ]} />
          )}
        </section>
      )}
    </>
  );
}
