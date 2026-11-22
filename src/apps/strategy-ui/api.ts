// No Delta apps (No Delta Paper, No Delta Live): every backend call, type and small formatter their screens share.
// Backend: backend/apps/strategy_ui (/api/strategy-ui/db/<db>/...). Each instance (src/apps.ts) is one database.
import { useQuery } from '@tanstack/react-query';
import { createContext, useContext } from 'react';
import { useSearchParams } from 'react-router';
import { api } from '@/api';
import type { NoDeltaApp } from '@/apps';
import type { User as BaseUser } from '@/users';
export { clock, dayLabel, inr, json, signedPct, todayIst, tone } from '../common/format';
import { todayIst } from '../common/format';

// broker / trade_status are null where this database's users table lacks the column (see useUserFields).
export type User = Omit<BaseUser, 'broker' | 'trade_status'> & { broker: string | null; trade_status: number | null };

// The instance whose screens these are (root, name, db), provided by routes(app) and the header.
const AppCtx = createContext<NoDeltaApp | null>(null);
export const AppProvider = AppCtx.Provider;
export function useApp() {
  const app = useContext(AppCtx);
  if (!app) throw new Error('useApp() outside a No Delta app');
  return app;
}

/** Call a database-scoped endpoint: sapi(db, 'users') → /api/strategy-ui/db/<db>/users */
export const sapi = <T>(db: string, path: string, init?: RequestInit) =>
  api<T>(`/api/strategy-ui/db/${encodeURIComponent(db)}/${path}`, init);
export const bapi = <T>(path: string, init?: RequestInit) => api<T>(`/api/strategy-ui/broker/${path}`, init);

// Live refresh for logs and PnL, as in the old app (1s). React Query skips it while the tab is hidden.
export { LIVE_MS as POLL_MS } from '@/api'; // same 1s as every screen (main.tsx default)

export const useUsers = (db: string) => useQuery({ queryKey: ['su', 'users', db], queryFn: () => sapi<User[]>(db, 'users') });
/** The users columns only newer engine databases have; screens hide the ones this database lacks. */
export type UserField = 'broker' | 'trade_status' | 'buying_power';
export const useUserFields = (db: string) =>
  useQuery({
    queryKey: ['su', 'user-fields', db],
    queryFn: () => sapi<{ fields: UserField[] }>(db, 'user-fields').catch(() => ({ fields: ['broker', 'trade_status', 'buying_power'] as UserField[] })),
    staleTime: Infinity,
    refetchInterval: false,
    select: (d) => d.fields,
  });


/** The database plus the ?user=&date= every screen carries; user defaults to the admin, date to today. */
export function useScope() {
  const { db } = useApp();
  const [sp] = useSearchParams();
  const users = useUsers(db);
  const list = users.data ?? [];
  const picked = list.find((u) => String(u.user_id) === sp.get('user'));
  const user = picked ?? list.find((u) => u.role.toLowerCase() === 'admin') ?? list[0];
  const date = sp.get('date') || todayIst();
  return { db, user, users: list, usersQuery: users, date, qs: (extra: Record<string, string> = {}) => `?${new URLSearchParams({ ...(user && { user: String(user.user_id) }), date, ...extra })}` };
}

/** Breadcrumb root: the app's name (its dashboard, keeping ?user=&date=). */
export const trail = (app: NoDeltaApp, qs = '') => [{ label: app.name, to: `${app.root}${qs}` }];

export const roleLabel = (r: string) => r.charAt(0).toUpperCase() + r.slice(1).toLowerCase();
