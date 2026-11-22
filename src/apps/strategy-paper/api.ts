// With Delta apps (With Delta Paper, With Delta Live): every backend call, type and small helper their screens share.
// Backend: backend/apps/strategy_paper, one router per instance (src/apps.ts `api`: /api/strategy-paper, /api/strategy-live).
import { useQuery } from '@tanstack/react-query';
import { createContext, useContext } from 'react';
import { useSearchParams } from 'react-router';
import { api } from '@/api';
import type { WithDeltaApp } from '@/apps';
import { todayIst } from '../common/format';

export { clock, dayLabel, humanDuration, inr, json, signedPct, todayIst, tone } from '../common/format';

// The instance whose screens these are (root, name, db, api prefix, mode), provided by routes(app) and the header.
const AppCtx = createContext<WithDeltaApp | null>(null);
export const AppProvider = AppCtx.Provider;
export function useApp() {
  const app = useContext(AppCtx);
  if (!app) throw new Error('useApp() outside a With Delta app');
  return app;
}

/** Call this instance's backend: papi(app, 'users') → /api/strategy-live/users. Query keys start with app.api too. */
export const papi = <T>(app: WithDeltaApp, path: string, init?: RequestInit) => api<T>(`${app.api}/${path}`, init);

// Live sections (logs, PnL, open positions) refresh every second, as in the old app.
// React Query skips it while the tab is hidden and never overlaps requests.
export { LIVE_MS as POLL_MS } from '@/api'; // same 1s as every screen (main.tsx default)

export type User = {
  user_id: number;
  first_name: string;
  last_name: string;
  full_name: string;
  email: string;
  mobile: string;
  trade_role: 'master' | 'user'; // the engine's paper_trade_role / live_trade_role
  broker: string;
  broker_name: string;
  client_id: string | null;
  has_credentials: boolean;
  buying_power: string | null;
  broker_connection_status: number;
  account_status: number;
  trade_status: number; // the engine's paper_trade_status / live_trade_status
};
export const isMaster = (u: Pick<User, 'trade_role'>) => u.trade_role === 'master';
/** "Vishal Konale (Paper: Master)" / "(Live: Master)" */
export const userLabel = (app: WithDeltaApp) => (u: User) => `${u.full_name} (${app.word}: ${isMaster(u) ? 'Master' : 'User'})`;

export const useUsers = () => {
  const app = useApp();
  return useQuery({
    queryKey: [app.api, 'users'],
    queryFn: async () => {
      const data = await papi<User[]>(app, 'users');
      return (data || []).map((u: any) => ({
        ...u,
        trade_role: u.trade_role ?? (u.role?.toLowerCase() === 'admin' ? 'master' : 'user'),
        broker_name: u.broker_name ?? u.broker ?? 'Angel One',
        has_credentials: u.has_credentials ?? !!(u.api_key && u.client_id),
        account_status: u.account_status ?? (u.is_active ? 1 : 0),
        trade_status: u.trade_status ?? 1,
        broker_connection_status: u.broker_connection_status ?? 1,
      }));
    },
  });
};

/** ?user=&date= every screen carries; user defaults to the master (else the first user), date to today. */
export function useScope() {
  const [sp] = useSearchParams();
  const users = useUsers();
  const list = users.data ?? [];
  const user = list.find((u) => String(u.user_id) === sp.get('user')) ?? list.find(isMaster) ?? list[0];
  const date = sp.get('date') || todayIst();
  return { user, users: list, usersQuery: users, date, qs: (extra: Record<string, string> = {}) => `?${new URLSearchParams({ ...(user && { user: String(user.user_id) }), date, ...extra })}` };
}

/** Breadcrumb root: the app's name (its dashboard, keeping ?user=&date=). */
export const trail = (app: WithDeltaApp, qs = '') => [{ label: app.name, to: `${app.root}${qs}` }];

// Log categories are the engine's logs_<category> tables in DB. Known ones keep this title and order;
// any other logs_* table found still gets a card, titled from its name, after them.
export const KNOWN_LOGS: { category: string; title: string }[] = [
  { category: 'ratelimit', title: 'Ratelimit' },
  { category: 'account', title: 'Account' },
  { category: 'protocol_1_cleaning', title: 'Protocol Cleaning' },
  { category: 'protocol_2_data_loading', title: 'Protocol Data Load' },
  { category: 'protocol_3_trading', title: 'Protocol Trade' },
  { category: 'broker_connection', title: 'Broker Connection' },
];
export const logTitle = (category: string) =>
  KNOWN_LOGS.find((k) => k.category === category)?.title ?? category.replace(/[_-]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
export const sortCategories = (cs: string[]) => {
  const rank = (c: string) => (KNOWN_LOGS.findIndex((k) => k.category === c) + 1 || KNOWN_LOGS.length + 1);
  return [...cs].sort((a, b) => rank(a) - rank(b) || a.localeCompare(b));
};
export const useLogDates = () => {
  const app = useApp();
  return useQuery({
    queryKey: [app.api, 'log-dates'],
    queryFn: () => papi<{ dates: string[]; categories: string[] }>(app, 'logs/dates'),
  }); // live every second (the default), so a new day or table appears on its own
};
