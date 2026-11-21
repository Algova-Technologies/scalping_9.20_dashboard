import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { useParams } from 'react-router';
import { clock } from '../Performance';
import { wallMs } from '../metrics';
import { useProject } from '../projects';
import { Crumbs, dbApi, LiveReload, MissingProject, projectTrail } from '../shared';
import { userQs, useUserFilter } from '../userFilter';

const secOfDay = (d: Date) => d.getHours() * 3600 + d.getMinutes() * 60 + d.getSeconds();

type Position = {
  id: number;
  user_id: number;
  user_name: string | null;
  variant_id: number | null;
  variant_name: string | null;
  symbol: string | null;
  strike: string | null;
  option_type: string | null;
  side: string | null;
  entry_at: string | null; // naive IST
  price: number;
  qty: number;
  lot_size: number;
};

// Same key everywhere → one shared cache entry, one request per second however many readers.
// react-query keeps the old object when a refetch returns equal data, and each reader
// re-renders only for the fields it reads, so a no-change poll repaints just the reload button.
const usePositions = (id: string, user: number | undefined, enabled = true) =>
  useQuery({
    queryKey: ['positions', id, user ?? null],
    queryFn: () => dbApi<Position[]>(id, `/api/positions${userQs(user)}`),
    enabled,
  });

// A card shows the value every position shares, or "Multiple" when they differ.
const shared = (xs: (string | null)[]) => {
  const u = [...new Set(xs.filter(Boolean))];
  return u.length === 1 ? u[0]! : u.length ? 'Multiple' : '—';
};
const dmy = (s: string | null) => {
  const ms = wallMs(s);
  return ms === null ? null : new Date(ms).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).replace(/ /g, '-');
};

// Only this cell ticks each second; the table around it never re-renders for the clock.
// Recomputed from Date.now() every tick, so it stays exact even if a tick is late. Hours go past 24.
function Elapsed({ since }: { since: number }) {
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const s = Math.max(0, Math.floor((now - since) / 1000));
  const pad = (n: number) => String(n).padStart(2, '0');
  return <>{`${pad(Math.floor(s / 3600))}:${pad(Math.floor(s / 60) % 60)}:${pad(s % 60)}`}</>;
}

function Reload({ id, user, ready }: { id: string; user: number | undefined; ready: boolean }) {
  const { isFetching, dataUpdatedAt, refetch } = usePositions(id, user, ready);
  return <LiveReload className="ml-auto" isFetching={isFetching} dataUpdatedAt={dataUpdatedAt} onReload={() => refetch()} />;
}

export function Component() {
  const { id = '' } = useParams();
  const { project: p } = useProject(id);
  const { user, ready, notFound } = useUserFilter(id);
  const { data, error } = usePositions(id, user, ready && !notFound);

  if (!p) return <MissingProject />;

  const qty = data ? data.reduce((a, r) => a + r.qty, 0) : 0;
  const lots = data ? data.reduce((a, r) => a + r.qty / r.lot_size, 0) : 0;
  const cards = data && [
    { label: 'Symbol', value: shared(data.map((r) => r.symbol)), cls: 'bg-blue-50 text-blue-700' },
    { label: 'Date', value: shared(data.map((r) => dmy(r.entry_at))), cls: 'bg-emerald-50 text-emerald-700' },
    { label: 'Strike Price', value: shared(data.map((r) => r.strike)), cls: 'bg-orange-50 text-orange-700' },
    { label: 'Lots · Quantity', value: `${+lots.toFixed(2)} lots · ${qty}`, cls: 'bg-indigo-50 text-indigo-700' },
  ];

  return (
    <>
      <Crumbs items={[...projectTrail(p), { label: 'Open Positions' }]} right={<Reload id={id} user={user} ready={ready && !notFound} />} />

      <section className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
        <h2 className="mb-4 text-base font-semibold">Open positions · {p.name}</h2>
        {!data ? (
          <p className="px-4 py-8 text-center text-sm text-zinc-400">{error ? <span className="text-red-600">{error.message}</span> : 'Loading…'}</p>
        ) : data.length === 0 ? (
          <p className="rounded-lg border border-zinc-200 px-4 py-8 text-center text-sm text-zinc-400">No open positions.</p>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
              {cards!.map((c) => (
                <div key={c.label} className={`rounded-lg px-4 py-4 text-center ${c.cls}`}>
                  <div className="text-base font-bold break-all tabular-nums md:text-lg">{c.value}</div>
                  <div className="mt-0.5 text-xs">{c.label}</div>
                </div>
              ))}
            </div>

            <div className="mt-5 overflow-x-auto rounded-lg border border-zinc-200">
              <table className="w-full text-center text-sm">
                <thead className="border-b border-zinc-200 bg-zinc-50">
                  <tr className="divide-x divide-zinc-200">
                    {['Variant', 'User', 'Entry Time', 'Transaction Type', 'Live Duration'].map((h) => (
                      <th key={h} className="px-3 py-3 text-xs font-medium tracking-wider whitespace-nowrap text-zinc-500 uppercase">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200">
                  {data.map((r) => (
                    <tr key={r.id} className="divide-x divide-zinc-200 hover:bg-zinc-50">
                      <td className="px-3 py-3 font-semibold whitespace-nowrap">{r.variant_name ?? (r.variant_id ? `#${r.variant_id} (deleted)` : '—')}</td>
                      <td className="px-3 py-3 whitespace-nowrap">{r.user_name || `#${r.user_id}`}</td>
                      <td className="px-3 py-3 whitespace-nowrap tabular-nums">{wallMs(r.entry_at) === null ? '—' : clock(secOfDay(new Date(wallMs(r.entry_at)!)))}</td>
                      <td className="px-3 py-3">
                        <span
                          className={`rounded px-2 py-0.5 text-xs font-semibold ${
                            r.side === 'BUY' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'
                          }`}
                        >
                          {r.side}
                        </span>
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap tabular-nums">
                        {wallMs(r.entry_at) === null ? '—' : <Elapsed since={wallMs(r.entry_at)!} />}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>
    </>
  );
}
