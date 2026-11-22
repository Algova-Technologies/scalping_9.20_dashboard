import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight, Search, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Navigate, useParams, useSearchParams } from 'react-router';
import { PAGE_SIZES, pageWindow } from '@/logs';
import { Crumbs, LiveReload, Notice } from '@/shared';
import { dayLabel, logTitle, papi, POLL_MS, trail, useApp, useLogDates, useScope } from '../api';

type Log = {
  id: number; level: string; timestamp: string; function: string; source: string;
  account_name: string | null; account_id: string | null; event: string; message: string;
  response: string | null; error: string | null; correlation_id: string | null;
  fields: Record<string, unknown> | null; extra: Record<string, unknown>; // extra: the table's own columns (symbol, order_id, http_status, ...), set ones only
};
type Page = { table: string; level_counts: Record<string, number>; total: number; page: number; page_size: number; logs: Log[] };

// Level tabs: Error = ERROR + CRITICAL, Info = INFO + WARNING.
const LEVELS = [
  { key: 'ALL', label: 'All', on: 'border-zinc-800 bg-zinc-800 text-white' },
  { key: 'SUCCESS', label: 'Success', on: 'border-emerald-600 bg-emerald-600 text-white' },
  { key: 'ERROR', label: 'Error', on: 'border-red-600 bg-red-600 text-white' },
  { key: 'INFO', label: 'Info', on: 'border-blue-600 bg-blue-600 text-white' },
];
const BADGE: Record<string, string> = {
  SUCCESS: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  ERROR: 'border-red-200 bg-red-50 text-red-700',
  CRITICAL: 'border-red-700 bg-red-700 text-white',
  INFO: 'border-blue-200 bg-blue-50 text-blue-700',
  WARNING: 'border-amber-200 bg-amber-50 text-amber-700',
};
const ACCENT: Record<string, string> = { ERROR: 'border-l-red-500', CRITICAL: 'border-l-red-700', WARNING: 'border-l-amber-400' };
const has = (v: string | null) => !!v && !['', 'N/A', 'NONE'].includes(v.trim());
const WRAP = '[overflow-wrap:anywhere]'; // engine tokens (EVENT_NAMES, JSON) wrap instead of widening the page
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
// "2026-11-19T15:20:59.001+05:30" → ["19 Nov 2026", "03:20:59.001 PM"], read as text: always the engine's IST clock.
const when = (ts: string | null) => {
  const m = ts && /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})\.(\d{3})/.exec(ts);
  if (!m) return null;
  return [`${m[3]} ${MONTHS[+m[2] - 1]} ${m[1]}`, `${String(+m[4] % 12 || 12).padStart(2, '0')}:${m[5]}:${m[6]}.${m[7]} ${+m[4] < 12 ? 'AM' : 'PM'}`];
};
const control = 'h-8 rounded-md border border-zinc-300 bg-white px-2 text-sm text-zinc-700 focus:ring-2 focus:ring-blue-100 focus:outline-none';
const pageBtn = 'inline-flex h-8 min-w-8 items-center justify-center rounded-md border px-2 text-sm disabled:cursor-not-allowed disabled:opacity-40';

// The details shown under a message: correlation id, the table's own columns, then the JSON fields.
const details = (l: Log) =>
  [...(l.correlation_id ? [['correlation_id', l.correlation_id]] : []), ...Object.entries(l.extra), ...Object.entries(l.fields ?? {})]
    .map(([k, v]) => `${k}=${typeof v === 'object' ? JSON.stringify(v) : String(v)}`);

// One engine log table (logs_<category>) for one day. Date, level, search, page and size live in the URL.
export function Component() {
  const app = useApp();
  const { root: ROOT, db: DB } = app;
  const { category = '' } = useParams();
  const { qs } = useScope();
  const [sp, setSp] = useSearchParams();
  const dates = useLogDates();
  const list = dates.data?.dates ?? [];
  const day = list.includes(sp.get('date') ?? '') ? sp.get('date')! : list[0] ?? ''; // the dashboard's date if it has logs, else the newest
  const level = LEVELS.find((l) => l.key === sp.get('level'))?.key ?? 'ALL';
  const size = PAGE_SIZES.find((n) => String(n) === sp.get('size')) ?? 50;
  const page = Math.max(1, Number(sp.get('page')) || 1);
  const q = sp.get('q') ?? '';
  const [typed, setTyped] = useState(q);
  const update = (patch: Record<string, string | number>) =>
    setSp(new URLSearchParams({ ...Object.fromEntries(sp), date: day, page: '1', ...Object.fromEntries(Object.entries(patch).map(([k, v]) => [k, String(v)])) }), { replace: 'q' in patch });
  // Debounced search: a request per pause, not per keystroke.
  useEffect(() => {
    if (typed.trim() === q) return;
    const t = setTimeout(() => update({ q: typed.trim() }), 300);
    return () => clearTimeout(t);
  }, [typed]); // eslint-disable-line react-hooks/exhaustive-deps -- only a new keystroke restarts the timer

  const logs = useQuery({
    queryKey: [app.api, 'logs', category, day, level, page, size, q],
    queryFn: () => papi<Page>(app, `logs?${new URLSearchParams({ date: day, category, level, page: String(page), page_size: String(size), ...(q && { search: q }) })}`),
    enabled: !!day && !!dates.data?.categories.includes(category), // never ask for a table that isn't there
    refetchInterval: POLL_MS,
    placeholderData: keepPreviousData,
  });

  // An unknown category goes back to the dashboard; if there are no log tables at all, say why below instead.
  if (dates.data?.categories.length && !dates.data.categories.includes(category)) return <Navigate replace to={ROOT} />;
  const d = logs.data;
  const total = (d as any)?.total ?? (d as any)?.total_count ?? 0;
  const last = d ? Math.max(1, Math.ceil(total / size)) : 1;
  const title = `${logTitle(category)} Logs`;
  const counts = d?.level_counts ?? {};

  return (
    <>
      <Crumbs
        items={[...trail(app, qs()), { label: title }]}
        right={<LiveReload isFetching={logs.isFetching} dataUpdatedAt={logs.dataUpdatedAt} onReload={() => logs.refetch()} />}
      />
      <section className="rounded-xl border border-zinc-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center gap-3 border-b border-zinc-200 p-4">
          <div className="min-w-0">
            <h1 className="text-lg font-semibold">{title}</h1>
            {d && <p className="truncate font-mono text-xs text-zinc-400">{DB}.{d.table}</p>}
          </div>
          <div className="flex flex-wrap gap-2" role="tablist" aria-label="Level">
            {LEVELS.filter((l) => l.key === 'ALL' || counts[l.key] > 0 || l.key === level).map((l) => (
              <button
                key={l.key}
                role="tab"
                aria-selected={l.key === level}
                onClick={() => update({ level: l.key })}
                className={`inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-sm ${l.key === level ? l.on : 'border-zinc-300 text-zinc-700 hover:border-zinc-500'}`}
              >
                {l.label} <span className="tabular-nums opacity-80">{(counts[l.key] ?? 0).toLocaleString('en-IN')}</span>
              </button>
            ))}
          </div>
          <div className="ml-auto flex w-full flex-wrap items-center gap-3 text-sm sm:w-auto">
            <label className="flex items-center gap-2 text-zinc-600">
              Date
              <select value={day} onChange={(e) => update({ date: e.target.value })} className={control} disabled={!list.length}>
                {list.map((x) => (
                  <option key={x} value={x}>
                    {dayLabel(x)}
                  </option>
                ))}
              </select>
            </label>
            <div className="relative w-full sm:w-64">
              <Search className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-zinc-400" />
              <input value={typed} onChange={(e) => setTyped(e.target.value)} maxLength={200} placeholder="Search logs..." aria-label="Search logs" className={`${control} w-full pr-8 pl-8`} />
              {typed && (
                <button onClick={() => { setTyped(''); update({ q: '' }); }} aria-label="Clear search" className="absolute top-1/2 right-2 -translate-y-1/2 text-zinc-400 hover:text-zinc-700">
                  <X className="size-4" />
                </button>
              )}
            </div>
          </div>
        </div>

        {(dates.error || logs.error) && !d && <div className="p-4"><Notice>{(dates.error ?? logs.error)!.message}</Notice></div>}
        {dates.data && !list.length && <div className="p-4"><Notice>No logs yet in {DB}.</Notice></div>}
        {d && (
          <>
            <p className="px-4 pt-3 text-sm text-zinc-600">
              {d.total > 0
                ? `Showing ${((page - 1) * size + 1).toLocaleString('en-IN')}–${Math.min(page * size, d.total).toLocaleString('en-IN')} of ${d.total.toLocaleString('en-IN')} entries for ${dayLabel(day)}, newest first`
                : q
                    ? `No entries match "${q}" on ${dayLabel(day)}.`
                    : `No entries for ${dayLabel(day)}.`}
              <span className="ml-2 text-xs text-zinc-400">Live · refreshing every second</span>
            </p>
            {d.logs.length > 0 && (
              <div className="mt-3 max-h-[70vh] overflow-auto border-y border-zinc-200">
                <table className="w-full min-w-[1100px] table-fixed text-left text-sm">
                  <colgroup>
                    <col className="w-[150px]" /><col className="w-[100px]" /><col className="w-[190px]" /><col /><col className="w-[160px]" /><col className="w-[150px]" /><col className="w-[130px]" />
                  </colgroup>
                  <thead className="sticky top-0 z-10 bg-zinc-50 text-xs font-medium tracking-wide text-zinc-500 uppercase">
                    <tr>
                      {['Date & Time (IST)', 'Level', 'Event', 'Message', 'Function', 'Source', 'Account'].map((h) => (
                        <th key={h} className="border-b border-zinc-200 px-3 py-2">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {d.logs.map((l) => {
                      const w = when(l.timestamp);
                      return (
                        <tr key={l.id} className="border-b border-zinc-200 align-top odd:bg-zinc-50 hover:bg-blue-50">
                          <td className={`border-l-4 px-3 py-2 text-xs tabular-nums ${ACCENT[l.level] ?? 'border-l-transparent'}`}>
                            {w ? <><span className="block font-medium">{w[0]}</span><span className="block font-mono text-zinc-500">{w[1]}</span></> : '—'}
                          </td>
                          <td className="px-3 py-2">
                            <span className={`inline-block rounded border px-2 py-0.5 text-xs font-semibold ${BADGE[l.level] ?? BADGE.INFO}`}>{l.level}</span>
                          </td>
                          <td className={`px-3 py-2 text-xs font-semibold ${WRAP}`}>
                            {l.event}
                          </td>
                          <td className="px-3 py-2">
                            <pre className={`font-mono text-[13px] leading-relaxed whitespace-pre-wrap ${WRAP}`}>{l.message}</pre>
                            {has(l.response) && <pre className={`mt-1 font-mono text-xs whitespace-pre-wrap text-zinc-500 ${WRAP}`}><b>RESPONSE: </b>{l.response}</pre>}
                            {details(l).length > 0 && <p className={`mt-1 font-mono text-xs text-zinc-500 ${WRAP}`}>{details(l).join(' · ')}</p>}
                            {has(l.error) && <pre className={`mt-1 rounded bg-red-50 px-2 py-1 font-mono text-xs whitespace-pre-wrap text-red-700 ${WRAP}`}><b>ERROR: </b>{l.error}</pre>}
                          </td>
                          <td className={`px-3 py-2 font-mono text-xs text-zinc-600 ${WRAP}`}>{has(l.function) ? l.function : '—'}</td>
                          <td className={`px-3 py-2 font-mono text-xs text-zinc-600 ${WRAP}`}>{has(l.source) ? l.source : '—'}</td>
                          <td className={`px-3 py-2 text-xs text-zinc-600 ${WRAP}`}>
                            {has(l.account_name) ? <>{l.account_name}{has(l.account_id) && <span className="block text-zinc-400">{l.account_id}</span>}</> : '—'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
            {d.total > 0 && (
              <div className="flex flex-wrap items-center gap-3 p-4 text-sm">
                <label className="flex items-center gap-2 text-zinc-600">
                  Show
                  <select value={size} onChange={(e) => update({ size: e.target.value })} className={control}>
                    {PAGE_SIZES.map((n) => <option key={n}>{n}</option>)}
                  </select>
                  entries
                </label>
                <nav aria-label="Pagination" className="ml-auto flex flex-wrap items-center gap-1">
                  <button className={`${pageBtn} border-zinc-300`} disabled={page <= 1} onClick={() => update({ page: page - 1 })} aria-label="Previous page"><ChevronLeft className="size-4" /></button>
                  {pageWindow(page, last).map((n, i) =>
                    n === '…' ? <span key={`gap${i}`} className="px-1 text-zinc-400">…</span> : (
                      <button key={n} onClick={() => update({ page: n })} aria-current={n === page ? 'page' : undefined}
                        className={`${pageBtn} ${n === page ? 'border-violet-600 bg-violet-600 font-semibold text-white' : 'border-zinc-300 hover:border-zinc-500'}`}>{n}</button>
                    ),
                  )}
                  <button className={`${pageBtn} border-zinc-300`} disabled={page >= last} onClick={() => update({ page: page + 1 })} aria-label="Next page"><ChevronRight className="size-4" /></button>
                </nav>
              </div>
            )}
          </>
        )}
      </section>
    </>
  );
}
