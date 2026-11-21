import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { Calendar, ChevronLeft, ChevronRight, Search, X } from 'lucide-react';
import { useState } from 'react';
import { useParams, useSearchParams } from 'react-router';
import { logTime, logTypes, PAGE_SIZES, pageWindow } from '@/logs';
import { Crumbs, LiveReload, Notice } from '@/shared';
import { dayLabel, todayIst, POLL_MS, trail, roleLabel, sapi, useApp, useScope } from '../api';

type Log = { id: string; date_time: string | null; message: string | null; log_origin: string | null; function_name: string | null; line_number: string | null; user_id: number | null };
type Page = { logs: Log[]; total: number; page: number; page_size: number; last_date: string | null };

const control = 'h-8 rounded-md border border-zinc-300 bg-white px-2 text-sm text-zinc-700 focus:ring-2 focus:ring-blue-100 focus:outline-none';
const pageBtn = 'inline-flex h-8 min-w-8 items-center justify-center rounded-md border px-2 text-sm disabled:cursor-not-allowed disabled:opacity-40';

// One log table for one day. User / date / page / size live in the URL; search and sort apply to the loaded page.
export function Component() {
  const app = useApp();
  const { type = '' } = useParams();
  const { db, user, users, date, qs } = useScope();
  const [sp, setSp] = useSearchParams();
  const [q, setQ] = useState('');
  const [sort, setSort] = useState<'default' | 'asc' | 'desc'>('default');
  const meta = logTypes.find((l) => l.type === type);
  const account = type.startsWith('account_');
  const size = PAGE_SIZES.find((n) => String(n) === sp.get('size')) ?? 50;
  const page = Math.max(1, Number(sp.get('page')) || 1);
  const update = (patch: Record<string, string | number>) =>
    setSp(new URLSearchParams({ ...Object.fromEntries(sp), ...(user && { user: String(user.user_id) }), date, page: '1', ...Object.fromEntries(Object.entries(patch).map(([k, v]) => [k, String(v)])) }));

  const logs = useQuery({
    queryKey: ['su', 'logs', db, type, account ? user?.user_id : null, date, page, size],
    queryFn: () =>
      sapi<Page>(db, `logs?${new URLSearchParams({ type, date, page: String(page), page_size: String(size), ...(account && user && { user: String(user.user_id) }) })}`),
    enabled: !!meta && (!account || !!user),
    refetchInterval: POLL_MS,
    placeholderData: keepPreviousData,
  });

  if (!meta) return <Notice>Unknown log type.</Notice>;
  const d = logs.data;
  const last = d ? Math.max(1, Math.ceil(d.total / size)) : 1;
  const nameOf = (id: number | null) => users.find((u) => u.user_id === id)?.full_name ?? '—';
  let rows = d?.logs ?? [];
  if (q) {
    const needle = q.toLowerCase();
    rows = rows.filter((l) => [logTime(l.date_time), l.message, l.log_origin, l.function_name, l.line_number, account ? nameOf(l.user_id) : ''].some((v) => v?.toLowerCase().includes(needle)));
  }
  if (sort !== 'default') rows = [...rows].sort((a, b) => (a.date_time ?? '').localeCompare(b.date_time ?? '') * (sort === 'asc' ? 1 : -1));
  const label = meta.label.replace(/\b\w/g, (c) => c.toUpperCase());

  return (
    <>
      <Crumbs
        items={[...trail(app, qs()), { label }]}
        right={<LiveReload isFetching={logs.isFetching} dataUpdatedAt={logs.dataUpdatedAt} onReload={() => { setSort('default'); logs.refetch(); }} />}
      />
      <section className="rounded-xl border border-zinc-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center gap-3 border-b border-zinc-200 p-4">
          <h1 className="text-lg font-semibold">{label}</h1>
          <div className="ml-auto flex flex-wrap items-center gap-3 text-sm">
            <label className="flex items-center gap-2 text-zinc-600">
              User
              <select value={user?.user_id ?? ''} onChange={(e) => update({ user: e.target.value })} className={control}>
                {users.map((u) => (
                  <option key={u.user_id} value={u.user_id}>
                    {u.full_name} ({roleLabel(u.role)})
                  </option>
                ))}
              </select>
            </label>
            <label className="flex items-center gap-2 text-zinc-600">
              Date
              <input type="date" value={date} max={todayIst()} onChange={(e) => e.target.value && update({ date: e.target.value })} className={control} />
            </label>
            <div className="relative w-full sm:w-auto">
              <Search className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-zinc-400" />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search logs..." aria-label="Search logs" className={`${control} w-full pr-8 pl-8 sm:w-56`} />
              {q && (
                <button onClick={() => setQ('')} aria-label="Clear search" className="absolute top-1/2 right-2 -translate-y-1/2 text-zinc-400 hover:text-zinc-700">
                  <X className="size-4" />
                </button>
              )}
            </div>
          </div>
        </div>

        <p className="px-4 pt-3 text-sm text-zinc-600">
          {d && d.total > 0 ? `Showing ${((page - 1) * size + 1).toLocaleString()} to ${Math.min(page * size, d.total).toLocaleString()} of ${d.total.toLocaleString()} entries` : 'No entries'}
          {sort !== 'default' && <span className="ml-2 rounded-full bg-blue-50 px-2 py-0.5 text-xs text-blue-700">{sort === 'asc' ? '↑ Oldest first' : '↓ Newest first'} (this page)</span>}
        </p>
        {logs.error && <p className="mx-4 mt-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{logs.error.message}</p>}

        {!d ? (
          <p className="p-8 text-center text-sm text-zinc-400">{logs.isPending ? 'Loading…' : ''}</p>
        ) : d.total === 0 ? (
          <div className="p-8 text-center">
            <p className="text-zinc-500">No logs found for the selected criteria</p>
            {d.last_date ? (
              <>
                <p className="mt-4 mb-2 text-sm text-zinc-400">Last available record found on:</p>
                <button onClick={() => update({ date: d.last_date! })} className="inline-flex h-9 items-center gap-2 rounded-md bg-blue-600 px-4 text-sm font-medium text-white hover:bg-blue-700">
                  <Calendar className="size-4" /> {dayLabel(d.last_date)}
                </button>
                <p className="mt-2 text-xs text-zinc-400">Click to view logs for this date</p>
              </>
            ) : (
              <p className="mt-2 text-sm text-zinc-400">This log has no records yet.</p>
            )}
          </div>
        ) : (
          <>
            <div className="mt-3 max-h-[65vh] overflow-auto border-y border-zinc-200">
              <table className="w-full min-w-[900px] text-center text-sm">
                <thead className="sticky top-0 bg-zinc-50 text-xs font-medium tracking-wide text-zinc-500 uppercase">
                  <tr className="divide-x divide-zinc-200">
                    <th className="w-[15%] px-3 py-2">
                      <button onClick={() => setSort((s) => (s === 'default' ? 'asc' : s === 'asc' ? 'desc' : 'default'))} title="Sort this page by date/time" className="uppercase hover:text-zinc-900">
                        Date &amp; Time <span className={sort === 'default' ? 'text-zinc-400' : 'text-blue-600'}>{sort === 'asc' ? '↑' : sort === 'desc' ? '↓' : '↕'}</span>
                      </button>
                    </th>
                    <th className="px-3 py-2 text-left">Message</th>
                    <th className="w-[13%] px-3 py-2">Log Origin</th>
                    <th className="w-[13%] px-3 py-2">Function Name</th>
                    <th className="w-[8%] px-3 py-2">Line Number</th>
                    {account && <th className="w-[12%] px-3 py-2">User Name</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200">
                  {rows.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-8 text-zinc-400">No logs on this page match "{q}".</td>
                    </tr>
                  )}
                  {rows.map((l) => (
                    <tr key={l.id} className="divide-x divide-zinc-200 odd:bg-zinc-50 hover:bg-blue-50">
                      <td className="px-3 py-1.5 whitespace-nowrap text-zinc-600 tabular-nums">{logTime(l.date_time)}</td>
                      <td className="px-3 py-1.5 text-left break-words whitespace-pre-wrap">{l.message}</td>
                      <td className="px-3 py-1.5 text-left text-zinc-600">{l.log_origin || '—'}</td>
                      <td className="px-3 py-1.5 text-left text-zinc-600">{l.function_name || '—'}</td>
                      <td className="px-3 py-1.5 text-zinc-600 tabular-nums">{l.line_number || '—'}</td>
                      {account && <td className="px-3 py-1.5 text-left text-zinc-600">{nameOf(l.user_id)}</td>}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex flex-wrap items-center gap-3 p-4 text-sm">
              <label className="flex items-center gap-2 text-zinc-600">
                Show
                <select value={size} onChange={(e) => update({ size: e.target.value })} className={control}>
                  {PAGE_SIZES.map((n) => (
                    <option key={n}>{n}</option>
                  ))}
                </select>
                entries
              </label>
              <nav aria-label="Pagination" className="ml-auto flex flex-wrap items-center gap-1">
                <button className={`${pageBtn} border-zinc-300`} disabled={page <= 1} onClick={() => update({ page: page - 1 })} aria-label="Previous page">
                  <ChevronLeft className="size-4" />
                </button>
                {pageWindow(page, last).map((n, i) =>
                  n === '…' ? (
                    <span key={`gap${i}`} className="px-1 text-zinc-400">…</span>
                  ) : (
                    <button
                      key={n}
                      onClick={() => update({ page: n })}
                      aria-current={n === page ? 'page' : undefined}
                      className={`${pageBtn} ${n === page ? 'border-violet-600 bg-violet-600 font-semibold text-white' : 'border-zinc-300 hover:border-zinc-500'}`}
                    >
                      {n}
                    </button>
                  ),
                )}
                <button className={`${pageBtn} border-zinc-300`} disabled={page >= last} onClick={() => update({ page: page + 1 })} aria-label="Next page">
                  <ChevronRight className="size-4" />
                </button>
              </nav>
            </div>
          </>
        )}
      </section>
    </>
  );
}
