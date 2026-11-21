import { useParams, useSearchParams } from 'react-router';
import { useProject, useTrades } from '../projects';
import { Crumbs, LiveReload, MissingProject, projectTrail } from '../shared';
import { DailyPerformance, dayLabel, TradesPerformance, WeeklyPerformance, weekLabel } from '../Performance';
import { projectUrl } from '@/apps';

// The project toolbar lives in the app header (see ProjectHeader.tsx).

export function Component() {
  const { id } = useParams();
  const [params, setParams] = useSearchParams();
  const { project: p } = useProject(id);
  // Active variant lives in the URL (?variant=<id>) so reload/share keeps it; defaults to the first.
  const active = p?.variants.find((v) => String(v.id) === params.get('variant')) ?? p?.variants[0];
  const trades = useTrades(id, active?.id);

  if (!p) return <MissingProject />;

  // Drill-down lives in the URL: ?week=<monday YYYY-MM-DD> → daily, &day=<YYYY-MM-DD> → trades.
  // Switching tabs drops both. Bad values are ignored.
  const isDate = (v: string | null) => (v && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : null);
  const week = isDate(params.get('week'));
  const day = week && isDate(params.get('day'));
  const base = active ? `${projectUrl(p.id)}/variants?variant=${active.id}` : '';

  // Breadcrumb tail: every level but the last is a link back up.
  const levels = [
    { label: 'Weekly Performance', to: base },
    ...(week ? [{ label: `${weekLabel(week)} · Daily Performance`, to: `${base}&week=${week}` }] : []),
    ...(day ? [{ label: `${dayLabel(day)} · Individual Trades`, to: '' }] : []),
  ];

  return (
    <>
      <div role="tablist" className="-mx-6 -mt-6 flex flex-wrap border-b border-zinc-200 bg-white px-6">
        {p.variants.map((v) => {
          const on = v.id === active?.id;
          return (
            <button
              key={v.id}
              role="tab"
              aria-selected={on}
              onClick={() => setParams({ variant: String(v.id) }, { replace: true })}
              className={`relative -mb-px flex-1 border-b-4 px-1.5 py-3 not-first:before:absolute not-first:before:top-1/4 not-first:before:left-0 not-first:before:h-1/2 not-first:before:w-px not-first:before:bg-zinc-200 text-sm whitespace-nowrap ${
                on
                  ? 'border-blue-600 bg-blue-50/60 font-bold text-zinc-900'
                  : 'border-transparent text-zinc-500 hover:border-zinc-300 hover:text-zinc-900'
              }`}
            >
              {v.name}
            </button>
          );
        })}
      </div>

      <div role="tabpanel" className="mt-4">
        {active ? (
          <>
            <Crumbs
              items={[...projectTrail(p), { label: active.name, to: base }, ...levels.map((l, i) => (i < levels.length - 1 ? l : { label: l.label }))]}
              right={<LiveReload isFetching={trades.isFetching} dataUpdatedAt={trades.dataUpdatedAt} onReload={() => trades.refetch()} />}
            />
            {!trades.data ? (
              <p className="rounded-xl border border-zinc-200 bg-white py-10 text-center text-sm text-zinc-400">
                {trades.error ? <span className="text-red-600">{trades.error.message}</span> : 'Loading…'}
              </p>
            ) : day ? (
              <TradesPerformance key={active.id + day} trades={trades.data} day={day} />
            ) : week ? (
              <DailyPerformance
                key={active.id + week}
                trades={trades.data}
                weekKey={week}
                onViewTrades={(d) => setParams({ variant: String(active.id), week, day: d })}
              />
            ) : (
              <WeeklyPerformance
                key={active.id}
                trades={trades.data}
                onViewDaily={(w) => setParams({ variant: String(active.id), week: w })}
              />
            )}
          </>
        ) : (
          <p className="text-sm text-zinc-500">No variants in this project yet.</p>
        )}
      </div>
    </>
  );
}
