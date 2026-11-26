import { ArrowUpRight, ChartColumn, Clock, IndianRupee, Wallet } from 'lucide-react';
import { useMemo, type ReactNode } from 'react';
import { Link, useParams } from 'react-router';
import { byVariant, stats, type Stats } from '../metrics';
import { hms, inr } from '../Performance';
import { fmt, sessionLabel, tone, useProject, useTrades } from '../projects';
import { Crumbs, projectTrail, LiveReload, Notice, MissingProject } from '../shared';
import { projectUrl } from '@/apps';

// Project home: a summary row for the whole project, then one overview card per variant
// with the same metrics side by side. Each card opens that variant's performance screen.
export function Component() {
  const { id } = useParams();
  const { project: p, isFetching, dataUpdatedAt, refetch } = useProject(id);
  const trades = useTrades(id);
  // Grouped and summarised once per trades/variants change, not on every header poll.
  // Declared before the early return so the hook order stays fixed.
  const perVariant = useMemo(() => {
    if (!trades.data) return undefined;
    const groups = byVariant(trades.data);
    return new Map((p?.variants ?? []).map((v) => [v.id, stats(groups.get(v.id) ?? [], 'trade')]));
  }, [trades.data, p?.variants]);
  if (!p) return <MissingProject />;

  const vs = p.variants;
  // Dot blinks on each summary refresh (every second); Reload also refetches the trades behind the variant cards.
  const live = (
    <LiveReload
      isFetching={isFetching || trades.isFetching}
      dataUpdatedAt={dataUpdatedAt}
      onReload={() => {
        refetch();
        trades.refetch();
      }}
    />
  );
  const crumbs = <Crumbs items={projectTrail(p, true)} right={live} />;
  if (vs.length === 0)
    return (
      <>
        {crumbs}
        <Notice>No variants in this project yet.</Notice>
      </>
    );

  // Best/worst only among variants that actually traded today; "—" until one has.
  const traded = [...vs].filter((v) => v.today_trades > 0).sort((a, b) => b.today_pct - a.today_pct);
  const best = traded[0];
  const worst = traded[traded.length - 1];
  const day = sessionLabel(p.session_date);
  const tiles = p.single
    ? // one fixed variant: no counts or best/worst to rank, so the overview says what it trades instead
      [
        { label: 'Variant (points)', value: vs[0].name, cls: 'bg-blue-50 text-blue-700' },
        { label: 'Open Positions', value: String(p.open_positions), cls: 'bg-indigo-50 text-indigo-700' },
        { label: `${day} PnL · ${fmt(p.today_pct)}`, value: inr(p.today_pnl), cls: `bg-orange-50 ${tone(p.today_pnl)}` },
        { label: `${day} trades`, value: String(vs[0].today_trades), cls: 'bg-fuchsia-50 text-fuchsia-700' },
      ]
    : [
        { label: 'Variants', value: String(vs.length), cls: 'bg-blue-50 text-blue-700' },
        { label: 'Open Positions', value: String(p.open_positions), cls: 'bg-indigo-50 text-indigo-700' },
        { label: `${day} PnL · ${fmt(p.today_pct)}`, value: inr(p.today_pnl), cls: `bg-orange-50 ${tone(p.today_pnl)}` },
        { label: `Profitable ${day}`, value: `${vs.filter((v) => v.today_pnl > 0).length} / ${vs.length}`, cls: 'bg-fuchsia-50 text-fuchsia-700' },
        { label: best ? `Best ${day} · ${best.name}` : `Best ${day}`, value: best ? fmt(best.today_pct) : '—', cls: `bg-emerald-50 ${tone(best?.today_pct ?? 0)}` },
        { label: worst ? `Worst ${day} · ${worst.name}` : `Worst ${day}`, value: worst ? fmt(worst.today_pct) : '—', cls: `bg-red-50 ${tone(worst?.today_pct ?? 0)}` },
      ];

  // md+: the page fills exactly the space between header and footer, no vertical scroll.
  // Variant rows share the leftover height equally but never shrink below their content.
  return (
    <div className="flex flex-col md:min-h-0 md:flex-1">
      {crumbs}
      <section className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
        <h2 className="text-sm font-semibold">{p.name} · Overview</h2>
        <div className={`mt-3 grid grid-cols-2 gap-2 ${p.single ? 'md:grid-cols-4' : 'sm:grid-cols-3 md:grid-cols-6'}`}>
          {tiles.map((t) => (
            <div key={t.label} className={`min-w-0 rounded-lg px-3 py-2 text-center ${t.cls}`}>
              <div className="text-base font-bold tabular-nums">{t.value}</div>
              <div className="mt-0.5 truncate text-xs" title={t.label}>
                {t.label}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Rows share the leftover height only when there are enough cards to fill it (2+ rows); fewer cards keep
          their natural height instead of stretching into a tall, mostly empty card. */}
      <div className={`mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-3 ${vs.length > 3 ? 'md:flex-1 md:auto-rows-[minmax(min-content,1fr)]' : 'content-start'}`}>
        {vs.map((v) => (
          <VariantCard
            key={v.id}
            to={`${projectUrl(p.id)}/variants?variant=${v.id}`}
            name={v.name}
            active={v.is_active}
            today={v.today_pct}
            day={day === 'Today' ? 'today' : day}
            s={perVariant?.get(v.id)}
          />
        ))}
      </div>
    </div>
  );
}

// Left-column metrics hug the card's left edge, right-column ones its right edge.
// Value shows above its label; flex-col-reverse keeps <dt> before <dd> for screen readers.
const Metric = ({ icon, label, right, children }: { icon: ReactNode; label: string; right?: boolean; children: ReactNode }) => (
  <div className={`flex min-w-0 flex-col-reverse ${right ? 'text-right' : ''}`}>
    <dt className={`flex items-center gap-1.5 text-xs text-zinc-500 ${right ? 'justify-end' : ''}`}>
      {icon} {label}
    </dt>
    <dd className="mb-0.5 truncate font-semibold tabular-nums">{children}</dd>
  </div>
);

function VariantCard({ to, name, active, today, day, s }: { to: string; name: string; active: boolean; today: number; day: string; s?: Stats }) {
  if (!s) return <div className="animate-pulse rounded-xl border border-zinc-200 bg-white p-4 shadow-sm" aria-busy="true" />;
  const total = s.totalPnl;
  const winRate = s.total ? (s.profitable / s.total) * 100 : 0;
  const lossRate = s.total ? (s.losing / s.total) * 100 : 0;
  const ic = 'size-3.5 shrink-0';
  return (
    <Link to={to} title="View performance" className="group flex flex-col justify-between gap-3 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm transition hover:border-zinc-400 hover:shadow">
      <div className="flex items-center gap-3">
        <h3 className="min-w-0 truncate text-base font-semibold">{name}</h3>
        {!active && <span className="shrink-0 rounded bg-zinc-100 px-1.5 py-0.5 text-[10px] font-semibold text-zinc-500 uppercase">Disabled</span>}
        <span
          className={`ml-auto shrink-0 rounded px-2 py-0.5 text-xs font-semibold tabular-nums ${
            today > 0 ? 'bg-emerald-50' : today < 0 ? 'bg-red-50' : 'bg-zinc-100'
          } ${tone(today)}`}
        >
          {fmt(today)} {day}
        </span>
        <ArrowUpRight className="size-4 shrink-0 text-zinc-300 transition group-hover:text-blue-600" />
      </div>

      <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
        <Metric icon={<IndianRupee className={ic} />} label="Total PnL">
          <span className={tone(total)}>{inr(total)}</span>
        </Metric>
        <Metric icon={<IndianRupee className={ic} />} label="Avg PnL / trade" right>
          <span className={tone(s.avgPnl)}>
            {inr(s.avgPnl)} <span className="text-xs font-medium">({fmt(s.avgPct)})</span>
          </span>
        </Metric>
        <Metric icon={<Clock className={ic} />} label="Avg trade duration">
          {hms(s.avgSec)}
        </Metric>
        <Metric icon={<Wallet className={ic} />} label="Avg invested" right>
          <span className="text-indigo-700">{inr(s.avgInvested)}</span>
        </Metric>
      </dl>

      <div>
        <div className="flex items-center gap-1.5 text-xs text-zinc-500">
          <ChartColumn className={ic} /> {s.total} trades
          <span className="ml-auto">
            <span className="font-medium text-emerald-600">{s.profitable} won</span> ·{' '}
            <span className="font-medium text-red-600">{s.losing} lost</span> · {winRate.toFixed(0)}% win rate
          </span>
        </div>
        <div className="mt-1.5 flex h-1.5 overflow-hidden rounded-full bg-zinc-100" aria-hidden>
          <div className="bg-emerald-500" style={{ width: `${winRate}%` }} />
          <div className="ml-auto bg-red-500" style={{ width: `${lossRate}%` }} />
        </div>
      </div>
    </Link>
  );
}
