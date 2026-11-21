import { useMemo, type ReactNode } from 'react';
import { useParams, useSearchParams } from 'react-router';
import { byVariant, type Grain, stats, type Stats } from '../metrics';
import { hms, inr } from '../Performance';
import { fmt, tone, useProject, useTrades } from '../projects';
import { Crumbs, LiveReload, MissingProject, projectTrail } from '../shared';

// `per` names the unit the count rows average over; Trade wise shows plain totals.
const grains: { value: Grain; label: string; per?: string }[] = [
  { value: 'monthly', label: 'Monthly', per: 'month' },
  { value: 'weekly', label: 'Weekly', per: 'week' },
  { value: 'daily', label: 'Daily', per: 'day' },
  { value: 'trade', label: 'Trade wise' },
];
// Averages can be fractional (6.5 trades/day): at most 2 decimals, none when whole.
// Best/worst rank variants by the Average PnL column, so they follow the selected grain.
const sorts = [
  { value: '', label: 'Variant order' },
  { value: 'best', label: 'Best first' },
  { value: 'worst', label: 'Worst first' },
];
const count = (n: number) => n.toLocaleString('en-IN', { maximumFractionDigits: 2 });

type S = Stats;

export function Component() {
  const { id } = useParams();
  const [params, setParams] = useSearchParams();
  const { project: p } = useProject(id);
  const trades = useTrades(id);
  // Filter lives in the URL (?by=) so reload/share keeps it.
  const g = grains.find((x) => x.value === params.get('by')) ?? grains[2];
  const sort = sorts.find((x) => x.value === params.get('sort'))?.value ?? '';

  // One grouping pass, then one stats() per variant; redone only when trades, variants
  // or the grain change. Before the early return so the hook order stays fixed.
  const rows = useMemo(() => {
    const groups = byVariant(trades.data ?? []);
    const all = (p?.variants ?? []).map((v) => ({ name: v.name, s: stats(groups.get(v.id) ?? [], g.value) }));
    if (sort) all.sort((a, b) => (sort === 'best' ? b.s.avgPnl - a.s.avgPnl : a.s.avgPnl - b.s.avgPnl));
    return all;
  }, [trades.data, p?.variants, g.value, sort]);

  if (!p) return <MissingProject />;
  // Metrics are columns, variants rows (variants grow; metrics don't). Two column groups
  // (money/time, then counts), split visually only.
  const sections: { label: [string, string]; cell: (s: S) => ReactNode }[][] = [
    [
    {
      label: ['Average', 'PnL'],
      cell: (s) => (
        <span className={`font-medium ${tone(s.avgPnl)}`}>
          {inr(s.avgPnl)} <span className="text-xs">({fmt(s.avgPct)})</span>
        </span>
      ),
    },
    { label: ['Average trade', 'duration'], cell: (s) => hms(s.avgSec) },
    { label: ['Average invested', 'amount'], cell: (s) => <span className="text-indigo-700">{inr(s.avgInvested)}</span> },
    ],
    [
    { label: g.per ? ['Avg trades', `per ${g.per}`] : ['Total', 'trades'], cell: (s) => count(s.tradesPer) },
    { label: g.per ? ['Avg losing trades', `per ${g.per}`] : ['Losing', 'trades'], cell: (s) => <span className="text-red-600">{count(s.losingTradesPer)}</span> },
    { label: g.per ? ['Avg profitable trades', `per ${g.per}`] : ['Profitable', 'trades'], cell: (s) => <span className="text-emerald-600">{count(s.profitableTradesPer)}</span> },
    ],
  ];

  return (
    <>
      <Crumbs items={[...projectTrail(p), { label: 'Compare' }]} right={<LiveReload isFetching={trades.isFetching} dataUpdatedAt={trades.dataUpdatedAt} onReload={() => trades.refetch()} />} />

      <section className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="text-base font-semibold">Compare variants · {p.name}</h2>
          <select
            aria-label="Group by"
            value={g.value}
            onChange={(e) => setParams((q) => (q.set('by', e.target.value), q), { replace: true })}
            className="ml-auto h-8 rounded-md border border-zinc-200 bg-white px-2 text-sm text-zinc-700 hover:border-zinc-400 focus:ring-2 focus:ring-zinc-200 focus:outline-none"
          >
            {grains.map((x) => (
              <option key={x.value} value={x.value}>
                {x.label}
              </option>
            ))}
          </select>
          <select
            aria-label="Sort"
            value={sort}
            onChange={(e) => setParams((q) => (e.target.value ? q.set('sort', e.target.value) : q.delete('sort'), q), { replace: true })}
            className="h-8 rounded-md border border-zinc-200 bg-white px-2 text-sm text-zinc-700 hover:border-zinc-400 focus:ring-2 focus:ring-zinc-200 focus:outline-none"
          >
            {sorts.map((x) => (
              <option key={x.value} value={x.value}>
                {x.label}
              </option>
            ))}
          </select>
        </div>
        {!trades.data ? (
          <p className="mt-4 py-8 text-center text-sm text-zinc-400">{trades.error ? <span className="text-red-600">{trades.error.message}</span> : 'Loading…'}</p>
        ) : rows.length === 0 ? (
          <p className="mt-4 py-8 text-center text-sm text-zinc-400">No variants to compare yet.</p>
        ) : (
        <div className="mt-4 overflow-x-auto rounded-lg border border-zinc-200">
          <table className="w-full text-center text-sm">
            <thead className="border-b border-zinc-200 bg-zinc-50 text-xs font-medium tracking-wider text-zinc-500 uppercase">
              <tr className="divide-x divide-zinc-200">
                <th scope="col" className="sticky left-0 z-10 bg-zinc-50 px-3 py-2 align-bottom shadow-[inset_-2px_0_0_var(--color-zinc-300)]">Variant</th>
                {sections.map((cols, i) =>
                  cols.map((c, j) => (
                    <th key={c.label.join(' ')} scope="col" className={`px-3 py-2 align-bottom ${i > 0 && j === 0 ? 'border-l-2 border-l-zinc-300' : ''}`}>
                      {c.label[0]}
                      <br />
                      {c.label[1]}
                    </th>
                  )),
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200">
              {rows.map((r) => (
                <tr key={r.name} className="group divide-x divide-zinc-200 hover:bg-zinc-50">
                  <th scope="row" className="sticky left-0 bg-white px-3 py-2 font-medium shadow-[inset_-2px_0_0_var(--color-zinc-300)] whitespace-nowrap text-zinc-700 group-hover:bg-zinc-50">
                    {r.name}
                  </th>
                  {sections.map((cols, i) =>
                    cols.map((c, j) => (
                      <td key={c.label.join(' ')} className={`px-3 py-2 whitespace-nowrap tabular-nums ${i > 0 && j === 0 ? 'border-l-2 border-l-zinc-300' : ''}`}>
                        {c.cell(r.s)}
                      </td>
                    )),
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        )}
      </section>
    </>
  );
}
