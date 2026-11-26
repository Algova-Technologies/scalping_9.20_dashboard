import { Database, UserCog } from 'lucide-react';
import { Link, useLocation, useSearchParams } from 'react-router';
import { dbShort, fmt, isDryrun, sessionLabel, tone, type Project, useDatabases, useProjects } from '../projects';
import { LiveReload } from '../shared';
import { appOf, projectUrl } from '@/apps';

// One colour per database so cards show where they come from. Dry-run databases get warm "not real money"
// colours; live ones get cool, clearly distinct hues. Each set is assigned by position within its own group
// of /api/databases (alphabetical), so live and dry-run never share a colour. Literal class names so Tailwind generates them.
const LIVE_COLORS = [
  { border: 'border-blue-400', dot: 'bg-blue-500', chip: 'border-blue-300 bg-blue-50' },
  { border: 'border-emerald-400', dot: 'bg-emerald-500', chip: 'border-emerald-300 bg-emerald-50' },
  { border: 'border-violet-400', dot: 'bg-violet-500', chip: 'border-violet-300 bg-violet-50' },
  { border: 'border-cyan-400', dot: 'bg-cyan-500', chip: 'border-cyan-300 bg-cyan-50' },
  { border: 'border-lime-400', dot: 'bg-lime-500', chip: 'border-lime-300 bg-lime-50' },
];
const DRYRUN_COLORS = [
  { border: 'border-orange-400', dot: 'bg-orange-500', chip: 'border-orange-300 bg-orange-50' },
  { border: 'border-red-400', dot: 'bg-red-500', chip: 'border-red-300 bg-red-50' },
  { border: 'border-amber-400', dot: 'bg-amber-500', chip: 'border-amber-300 bg-amber-50' },
  { border: 'border-rose-400', dot: 'bg-rose-500', chip: 'border-rose-300 bg-rose-50' },
];
type DbColor = (typeof LIVE_COLORS)[number];

function ProjectCard({ p, color }: { p: Project; color: DbColor }) {
  return (
    <Link
      to={`${projectUrl(p.id)}`}
      className={`@container block rounded-lg border-2 ${color.border} bg-white p-5 transition hover:shadow-md`}
    >
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <h2 className="flex min-w-0 items-center gap-2 text-base font-semibold">
          <Database className="size-4 shrink-0 text-zinc-400" />
          <span className="whitespace-nowrap">{p.name}</span>
          {p.expiry && (
            <span className="shrink-0 text-xs font-normal whitespace-nowrap text-zinc-400" title={`Upcoming expiry: ${p.expiry}`}>
              {p.expiry.replace(/^(\d{2})([A-Z])([A-Z]{2})\d{4}$/, (_, d, m, on) => `${d} ${m}${on.toLowerCase()}`)}
            </span>
          )}
          {!p.active && <span className="rounded bg-zinc-100 px-1.5 text-xs font-medium text-zinc-500">Disabled</span>}
        </h2>
        <div className="ml-auto inline-flex shrink-0 items-center gap-2 rounded-md border border-zinc-200 px-2 py-1 text-xs whitespace-nowrap text-zinc-500">
        <span
          className={`rounded px-1.5 text-sm font-semibold tabular-nums ${
            p.open_positions ? 'bg-blue-50 text-blue-700' : 'bg-zinc-100 text-zinc-400'
          }`}
        >
          {p.open_positions}
        </span>
          Open positions
        </div>
        <span className="shrink-0 text-xs font-medium tracking-wide text-zinc-400 uppercase">{sessionLabel(p.session_date)}</span>
      </div>

      <p className="mt-4 flex items-center gap-1.5 text-xs font-medium text-zinc-700" title="Admin">
        <UserCog aria-label="Admin" className="size-3.5 shrink-0 text-zinc-400" />
        <span className="truncate">{p.admin ?? '—'}</span>
        <span className="ml-auto flex min-w-0 items-center gap-1.5 font-normal text-zinc-400" title="Database">
          <span className={`size-2 shrink-0 rounded-full ${color.dot}`} />
          <span className="truncate">{p.database}</span>
        </span>
      </p>
      <dl className="relative mt-3 -mx-3 grid grid-cols-3 gap-y-3 text-sm @lg:grid-cols-4">
        {p.variants.map((v) => (
          <div
            key={v.id}
            className="flex min-w-0 items-baseline justify-between gap-2 px-3"
          >
            <dt className={`truncate ${v.is_active ? 'text-zinc-600' : 'text-zinc-400 line-through'}`} title={v.is_active ? undefined : 'Disabled'}>
              {v.name}
            </dt>
            <dd className={`font-medium tabular-nums ${tone(v.today_pct)}`}>{fmt(v.today_pct)}</dd>
          </div>
        ))}
        {/* Column dividers: 3 columns on a narrow card, 4 once it is @lg wide. */}
        {['left-1/3 @lg:hidden', 'left-2/3 @lg:hidden', 'hidden left-1/4 @lg:block', 'hidden left-1/2 @lg:block', 'hidden left-3/4 @lg:block'].map(
          (l) => p.variants.length > 1 && <span key={l} aria-hidden className={`absolute inset-y-0 ${l} w-px bg-zinc-200`} />,
        )}
        {p.variants.length === 0 && <p className="col-span-full px-3 text-zinc-400">No variants yet.</p>}
      </dl>
    </Link>
  );
}

export function Component() {
  // every user; per-project user filters apply inside a project. Live every second, like every screen.
  // ?db=<name> in the URL keeps the choice across reloads and links; ?db=all = All; absent = the first live database.
  // This app's databases only (its Go project's database + its dry-run copy); All = both of them.
  const app = appOf(useLocation().pathname);
  const [params, setParams] = useSearchParams();
  const databases = useDatabases(app.engine);
  const all = databases.data ?? [];
  const asked = params.get('db');
  const picked = asked === 'all' || (asked && all.includes(asked)) ? asked : all.find((d) => !isDryrun(d)) ?? all[0];
  const database = picked === 'all' ? undefined : picked;
  // Without ?db, wait for the database list so the first fetch is already the live one (All if the list fails).
  const resolved = params.get('db') === 'all' || !databases.isPending;
  const colorOf = (d: string) => {
    const set = isDryrun(d) ? DRYRUN_COLORS : LIVE_COLORS;
    const group = all.filter((x) => isDryrun(x) === isDryrun(d));
    return set[Math.max(0, group.indexOf(d)) % set.length];
  };
  const projects = useProjects(undefined, resolved, undefined, database);
  const { isPending, error, isFetching, dataUpdatedAt, refetch } = projects;
  const data = projects.data?.filter((p) => all.includes(p.database)); // All fetches every database: keep this app's
  // The engine's own database first, then its dry run; empty groups hidden. The group label says which.
  const groups = ([['Engine', all.filter((d) => !isDryrun(d))], ['Dry run', all.filter(isDryrun)]] as const).filter(([, ds]) => ds.length);
  const tab = (d: string | undefined) => {
    const on = d === database;
    return (
      <button
        key={d ?? ''}
        role="radio"
        aria-checked={on}
        title={d ?? `Every ${app.label} database`}
        onClick={() => setParams({ db: d ?? 'all' })}
        className={`inline-flex h-7 items-center gap-2 rounded-md border px-2.5 text-sm whitespace-nowrap transition ${
          on ? `${d ? colorOf(d).chip : 'border-zinc-300 bg-white'} font-medium text-zinc-900 shadow-xs` : 'border-transparent text-zinc-600 hover:bg-white hover:text-zinc-900'
        }`}
      >
        {d && <span className={`size-2 rounded-full ${colorOf(d).dot}`} />}
        {d ? dbShort(d) : 'All'}
      </button>
    );
  };
  return (
    <>
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">{app.name}</h1>
        <LiveReload className="ml-auto" isFetching={isFetching} dataUpdatedAt={dataUpdatedAt} onReload={() => refetch()} />
      </div>
      <div role="radiogroup" aria-label="Database" className="mx-auto mt-4 flex w-fit max-w-full flex-wrap items-center justify-center gap-1 rounded-lg border border-zinc-200 bg-zinc-50 p-1">
        {tab(undefined)}
        {groups.map(([label, ds]) => (
          <div key={label} role="group" aria-label={label} className="flex flex-wrap items-center gap-1 border-l border-zinc-300 pl-2">
            <span className="px-1 text-xs font-medium tracking-wide text-zinc-400 uppercase">{label}</span>
            {ds.map(tab)}
          </div>
        ))}
      </div>

      {isPending && <p className="mt-6 text-sm text-zinc-400">Loading…</p>}
      {error && <p className="mt-6 text-sm text-red-600">{error.message}</p>}
      {data?.length === 0 && <p className="mt-6 text-sm text-zinc-500">No trading projects found.</p>}
      <div className="mt-6 grid gap-4 min-[1024px]:grid-cols-2 min-[1360px]:grid-cols-3">
        {data?.map((p) => (
          <ProjectCard key={p.id} p={p} color={colorOf(p.database)} />
        ))}
      </div>
    </>
  );
}
