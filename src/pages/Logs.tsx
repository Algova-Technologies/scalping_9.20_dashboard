import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { ArrowDown, ArrowUp, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Search } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router';
import { logTime, logTypes, type LogsPage, PAGE_SIZES, pageWindow } from '../logs';
import { useProject } from '../projects';
import { Crumbs, projectTrail, dbApi, LiveReload, Notice, MissingProject } from '../shared';
import { projectUrl } from '@/apps';

// Two screens: /projects/:id/logs/live (<name>_live tables, today's rows) and /logs/archives
// (<name>_archives, rows the engine moved at 15:31). Everything else lives in the URL
// (?type=&date=&q=&page=&size=&sort=), so reload/share keeps it. date: archives only.
type Params = { db: string; type: string; q: string; page: number; size: number; sort: 'desc' | 'asc'; scope: 'live' | 'archives'; date: string };

// Live every second (the default). keepPreviousData: paging/searching swaps rows in place instead of flashing "Loading".
// Held back until the project and log type are known: firing with db='' asked the server for
// /api/projects//logs, which 404s and flashed that error under the table on every load.
const useLogs = (p: Params) =>
  useQuery({
    queryKey: ['logs', p],
    queryFn: () =>
      dbApi<LogsPage>(
        p.db,
        `/api/logs?${new URLSearchParams({ type: p.type, q: p.q, page: String(p.page), page_size: String(p.size), sort: p.sort, scope: p.scope, ...(p.date && { date: p.date }) })}`,
      ),
    enabled: !!p.db && !!p.type,
    placeholderData: keepPreviousData,
  });

// Days that have archived rows of this type, newest first: the archive date dropdown.
const useLogDates = (db: string, type: string, on: boolean) =>
  useQuery({
    queryKey: ['log_dates', db, type],
    queryFn: () => dbApi<string[]>(db, `/api/log_dates?${new URLSearchParams({ type })}`),
    enabled: on && !!db && !!type,
  });

// Subscribes to fetch state on its own, so the table doesn't re-render for the dot and icon.
function Reload({ params }: { params: Params }) {
  const { isFetching, dataUpdatedAt, refetch } = useLogs(params);
  return <LiveReload isFetching={isFetching} dataUpdatedAt={dataUpdatedAt} onReload={() => refetch()} />;
}

const pageBtn = 'inline-flex h-8 min-w-8 items-center justify-center rounded-md border px-2 text-sm tabular-nums disabled:cursor-not-allowed disabled:opacity-40';

export function Component() {
  const { id, scope: rawScope } = useParams();
  const { project: p } = useProject(id);
  const scope = rawScope === 'live' || rawScope === 'archives' ? rawScope : null;
  const [sp, setSp] = useSearchParams();
  const lt = logTypes.find((t) => t.slug === sp.get('type')) ?? logTypes[0];
  const slug = lt.slug;

  const size = PAGE_SIZES.find((n) => String(n) === sp.get('size')) ?? 25;
  const page = Math.max(1, Number(sp.get('page')) || 1);
  const sort = sp.get('sort') === 'asc' ? 'asc' : 'desc';
  const q = sp.get('q') ?? '';
  const params: Params = { db: p?.db ?? '', type: scope ? lt.type : '', q, page, size, sort, scope: scope ?? 'live', date: '' };
  if (scope === 'archives') params.date = /^\d{4}-\d{2}-\d{2}$/.test(sp.get('date') ?? '') ? sp.get('date')! : '';
  const { data: dates } = useLogDates(params.db, params.type, scope === 'archives');

  // Merge into the URL; any change other than the page itself goes back to page 1.
  const update = (next: Record<string, string | number>) =>
    setSp(
      (cur) => {
        const s = new URLSearchParams(cur);
        if (!('page' in next)) s.delete('page');
        for (const [k, v] of Object.entries(next)) {
          if (v === '' || (k === 'page' && v === 1)) s.delete(k);
          else s.set(k, String(v));
        }
        return s;
      },
      { replace: true },
    );

  // Search box types freely; the URL (and the query) follows 300ms after typing stops.
  // Reset only when the screen or log type changes, never from the URL mid-typing (that would eat trailing spaces).
  const [draft, setDraft] = useState(q);
  useEffect(() => setDraft(new URLSearchParams(window.location.search).get('q') ?? ''), [scope, slug]);
  useEffect(() => {
    if (draft.trim() === q) return;
    const t = setTimeout(() => update({ q: draft.trim() }), 300);
    return () => clearTimeout(t);
  }, [draft]);

  const { data, error, isPending } = useLogs(params);
  const last = data ? Math.max(1, Math.ceil(data.total / size)) : 1;
  // Search/size shrank the result below the current page: jump to the last real page.
  useEffect(() => {
    if (data && page > last) update({ page: last });
  }, [data, page, last]);

  if (!p) return <MissingProject />;
  if (!scope) return <Notice>Unknown logs screen.</Notice>;

  const from = data && data.total ? (page - 1) * size + 1 : 0;
  const to = data ? Math.min(page * size, data.total) : 0;
  const SortIcon = sort === 'desc' ? ArrowDown : ArrowUp;
  const title = scope === 'live' ? 'Live logs' : 'Archived logs';
  // Switching screens keeps the chosen log type, drops search and paging.
  const typeQs = slug === logTypes[0].slug ? '' : `?type=${slug}`;
  const screens = (
    <div role="group" aria-label="Live or archived logs" className="inline-flex rounded-md border border-zinc-300 bg-white p-0.5 text-sm">
      {(['live', 'archives'] as const).map((s) => (
        <Link
          key={s}
          to={`${projectUrl(p.id)}/logs/${s}${typeQs}`}
          aria-current={s === scope ? 'page' : undefined}
          className={`rounded px-3 py-1 font-medium ${s === scope ? 'bg-blue-600 text-white' : 'text-zinc-600 hover:text-zinc-900'}`}
        >
          {s === 'live' ? 'Live logs' : 'Archived logs'}
        </Link>
      ))}
    </div>
  );

  return (
    <>
      <Crumbs items={[...projectTrail(p), { label: title }]} right={screens} />
      <section className="rounded-xl border border-zinc-200 bg-white shadow-sm">
        {/* lg+: entry count far left, title centred in the space between, controls far right. Smaller: stacked. */}
        <div className="grid items-center gap-3 border-b border-zinc-200 p-4 lg:grid-cols-[auto_1fr_auto]">
          <p className="text-sm text-zinc-600 lg:order-1">
            {data && (
              <>
                Showing {from.toLocaleString('en-IN')} to {to.toLocaleString('en-IN')} of {data.total.toLocaleString('en-IN')} entries
              </>
            )}
          </p>
          <h2 className="-order-1 text-center text-base font-semibold lg:order-2">
            {title} · {lt.short}
          </h2>
          <div className="flex flex-wrap items-center gap-3 lg:order-3 lg:justify-end">
            <Reload params={params} />
            <select
              aria-label="Log type"
              value={slug}
              onChange={(e) => update({ type: e.target.value === logTypes[0].slug ? '' : e.target.value })}
              className="h-9 rounded-md border border-zinc-300 bg-white px-2 text-sm focus:ring-2 focus:ring-blue-100 focus:outline-none"
            >
              {logTypes.map((t) => (
                <option key={t.slug} value={t.slug}>
                  {t.short}
                </option>
              ))}
            </select>
            {scope === 'archives' && (
              <select
                aria-label="Archive date"
                value={params.date}
                onChange={(e) => update({ date: e.target.value })}
                className="h-9 rounded-md border border-zinc-300 bg-white px-2 text-sm focus:ring-2 focus:ring-blue-100 focus:outline-none"
              >
                <option value="">All dates</option>
                {/* keep a picked date selectable even when this log type has no rows that day */}
                {params.date && !dates?.includes(params.date) && <option value={params.date}>{logTime(`${params.date}T00:00:00`).split(',')[0]}</option>}
                {dates?.map((d) => (
                  <option key={d} value={d}>
                    {logTime(`${d}T00:00:00`).split(',')[0]}
                  </option>
                ))}
              </select>
            )}
            <label className="relative">
              <span className="sr-only">Search logs</span>
              <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-zinc-400" />
              <input
                type="search"
                value={draft}
                maxLength={200}
                placeholder="Search message, origin…"
                onChange={(e) => setDraft(e.target.value)}
                className="h-9 w-64 max-w-full rounded-md border border-zinc-300 bg-white pr-3 pl-9 text-sm placeholder:text-zinc-400 focus:ring-2 focus:ring-blue-100 focus:outline-none"
              />
            </label>
          </div>
        </div>

        {isPending || !params.db ? (
          <p className="py-10 text-center text-sm text-zinc-400">Loading…</p>
        ) : !data ? (
          <p className="py-10 text-center text-sm text-red-600">{error?.message}</p>
        ) : (
          <>
            {error && <p className="mx-4 mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">Refresh failed: {error.message}</p>}
            <div className="overflow-x-auto">
              <table className="w-full text-center text-xs">
                <thead className="border-b border-zinc-200 bg-zinc-50 text-xs font-medium tracking-wider text-zinc-500 uppercase">
                  <tr className="divide-x divide-zinc-200">
                    <th className="px-2 py-2 whitespace-nowrap">
                      <button
                        onClick={() => update({ sort: sort === 'desc' ? 'asc' : '' })}
                        className="inline-flex items-center gap-1.5 uppercase hover:text-zinc-900"
                        aria-label={`Date and time, sorted ${sort === 'desc' ? 'newest' : 'oldest'} first. Click to reverse.`}
                      >
                        Date &amp; Time <SortIcon className="size-3.5" />
                      </button>
                    </th>
                    <th className="px-2 py-2 text-left">Message</th>
                    <th className="px-2 py-2 whitespace-nowrap">Log Origin</th>
                    <th className="px-2 py-2 whitespace-nowrap">Function Name</th>
                    <th className="px-2 py-2 whitespace-nowrap">Line Number</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200">
                  {data.logs.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-10 text-zinc-400">
                        {q ? `No logs match "${q}".` : params.date ? 'No logs on this date.' : 'No logs yet.'}
                      </td>
                    </tr>
                  ) : (
                    data.logs.map((l) => (
                      <tr key={l.id} className="divide-x divide-zinc-200 hover:bg-zinc-50">
                        <td className="px-2 py-1 whitespace-nowrap text-zinc-600 tabular-nums">{logTime(l.date_time)}</td>
                        <td className="px-2 py-1 text-left break-words">{l.message}</td>
                        <td className="px-2 py-1 text-zinc-600">{l.log_origin}</td>
                        <td className="px-2 py-1 text-zinc-600">{l.function_name}</td>
                        <td className="px-2 py-1 text-zinc-600 tabular-nums">{l.line_number}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="flex flex-wrap items-center gap-3 border-t border-zinc-200 p-4 text-sm">
              <label className="flex items-center gap-2 text-zinc-600">
                Rows per page
                <select
                  value={size}
                  onChange={(e) => update({ size: e.target.value === '25' ? '' : e.target.value })}
                  className="h-8 rounded-md border border-zinc-300 bg-white px-2 text-sm text-zinc-700 focus:ring-2 focus:ring-blue-100 focus:outline-none"
                >
                  {PAGE_SIZES.map((n) => (
                    <option key={n}>{n}</option>
                  ))}
                </select>
              </label>
              <span className="text-zinc-500">
                Page {page} of {last}
              </span>
              <nav aria-label="Pagination" className="ml-auto flex flex-wrap items-center gap-1">
                <button className={`${pageBtn} border-zinc-300`} disabled={page <= 1} onClick={() => update({ page: 1 })} aria-label="First page">
                  <ChevronsLeft className="size-4" />
                </button>
                <button className={`${pageBtn} border-zinc-300`} disabled={page <= 1} onClick={() => update({ page: page - 1 })} aria-label="Previous page">
                  <ChevronLeft className="size-4" />
                </button>
                {pageWindow(page, last).map((n, i) =>
                  n === '…' ? (
                    <span key={`gap${i}`} className="px-1 text-zinc-400">
                      …
                    </span>
                  ) : (
                    <button
                      key={n}
                      onClick={() => update({ page: n })}
                      aria-current={n === page ? 'page' : undefined}
                      className={`${pageBtn} ${n === page ? 'border-blue-600 bg-blue-600 font-semibold text-white' : 'border-zinc-300 hover:border-zinc-500'}`}
                    >
                      {n}
                    </button>
                  ),
                )}
                <button className={`${pageBtn} border-zinc-300`} disabled={page >= last} onClick={() => update({ page: page + 1 })} aria-label="Next page">
                  <ChevronRight className="size-4" />
                </button>
                <button className={`${pageBtn} border-zinc-300`} disabled={page >= last} onClick={() => update({ page: last })} aria-label="Last page">
                  <ChevronsRight className="size-4" />
                </button>
              </nav>
            </div>
          </>
        )}
      </section>
    </>
  );
}
