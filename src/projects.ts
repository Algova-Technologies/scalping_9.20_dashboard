import { useQuery } from '@tanstack/react-query';
import { api, isNotFound, LIVE_MS } from './api';
import { type ApiTrade, fromApi } from './metrics';
import { useUserFilter } from './userFilter';

// Live from GET /api/projects: every row of each engine database's projects table, with today's net PnL per variant (IST) and open positions.
export type VariantToday = {
  id: number;
  name: string;
  is_active: boolean;
  today_pnl: number;
  today_invested: number;
  today_pct: number;
  today_trades: number;
};
export type Project = {
  id: string; // <projects.code>@<database>, e.g. BANKNIFTY@scalping_9.20_no_delta_multi_variant_dryrun; also used in URLs
  code: string;
  database: string;
  db: string; // same as id, kept so project-scoped calls read naturally: dbApi(p.db, …)
  name: string; // projects.name
  admin: string | null; // the project's admin user, by name
  expiry: string | null; // settings.expiry, e.g. 23NOV2026
  active: boolean; // projects.status: false = the engine does not run this project
  open_positions: number;
  today_pnl: number;
  today_pct: number;
  session_date: string; // YYYY-MM-DD the today_* numbers cover: today, or the last trading day before it
  variants: VariantToday[];
};

// "Today", or the session's date ("16 Nov") while today has no trades yet and the numbers are from an earlier day.
export const sessionLabel = (d: string) =>
  d === new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' })
    ? 'Today'
    : new Date(`${d}T00:00`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });

// `only` asks the server for that one project instead of every project, so a screen
// that just needs its own numbers doesn't poll the whole estate.
// Refreshes every second (LIVE_MS), like every query. It stays out of
// the query key, so callers sharing a key share one cache entry and one in-flight request.
// `database` limits the list to one engine database; omitted = every database.
export const useProjects = (user?: number, enabled = true, only?: string, database?: string) =>
  useQuery({
    queryKey: ['projects', user ?? null, only ?? null, database ?? null],
    queryFn: async () => {
      const qs = new URLSearchParams();
      if (user !== undefined) qs.set('user', String(user));
      if (only) qs.set('project', only);
      if (database) qs.set('database', database);
      const rows = await api<Omit<Project, 'db'>[]>(`/api/projects${qs.size ? `?${qs}` : ''}`);
      return rows.map((p) => ({ ...p, db: p.id }));
    },
    // Keep polling through transient failures, but stop once the project is gone:
    // a 404 won't fix itself, and this query polls on every screen.
    refetchInterval: (q) => (isNotFound(q.state.error) ? false : LIVE_MS),
    enabled,
  });

export const isDryrun = (d: string) => /dry_?run/i.test(d);
// Dashboard tab name: the Live / Dry run group carries the suffix.
export const dbShort = (d: string) => d.replace(/^scalping_/, '').replace(/_(live|dry_?run)$/i, '');

// Engine databases the dashboard can filter on (live; new ones appear on refetch).
export const useDatabases = () => useQuery({ queryKey: ['databases'], queryFn: () => api<string[]>('/api/databases') });

// One project, with that project's header user filter applied to its "today" numbers.
// `notFound` short-circuits: once the users call has 404'd we know the project is missing,
// so the summary never has to ask again, and the screen can say so instead of spinning.
export function useProject(id: string | undefined) {
  const { user, ready, notFound } = useUserFilter(id);
  // Feeds the header's live open-positions badge on every project screen.
  const q = useProjects(user, ready && !!id && !notFound, id);
  return {
    project: q.data?.find((p) => p.id === id),
    isPending: !notFound && (!ready || q.isPending),
    error: q.error,
    user,
    notFound: notFound || isNotFound(q.error),
    isFetching: q.isFetching,
    dataUpdatedAt: q.dataUpdatedAt,
    refetch: q.refetch,
  };
}

// Closed trades of a project (optionally one variant), net PnL, filtered by the project's header user.
// Live (every second, the default): a variant's exits land intraday (unarchived pairs included server-side), not just at day end.
export function useTrades(project: string | undefined, variant?: number) {
  const { user, ready, notFound } = useUserFilter(project);
  return useQuery({
    queryKey: ['trades', project, user ?? null, variant ?? null],
    queryFn: async () => {
      const qs = new URLSearchParams();
      if (user !== undefined) qs.set('user', String(user));
      if (variant !== undefined) qs.set('variant', String(variant));
      const rows = await api<ApiTrade[]>(`/api/projects/${encodeURIComponent(project!)}/trades${qs.size ? `?${qs}` : ''}`);
      return rows.map(fromApi);
    },
    enabled: !!project && ready && !notFound,
  });
}

export const fmt = (n: number) => `${n > 0 ? '+' : ''}${n.toFixed(2)}%`;
export const tone = (n: number) => (n > 0 ? 'text-emerald-600' : n < 0 ? 'text-red-600' : 'text-zinc-400');
