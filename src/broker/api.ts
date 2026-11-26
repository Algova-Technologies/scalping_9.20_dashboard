// Broker portal (No Delta apps): log in to a broker, view profile and balance, save accounts.
// Backend: apps/strategy_ui/broker.py (/api/strategy-ui/broker/...), its own SQLite store, no engine database.
import { useLocation } from 'react-router';
import { api } from '@/api';
import { appOf } from '@/apps';

export const bapi = <T>(path: string, init?: RequestInit) => api<T>(`/api/strategy-ui/broker/${path}`, init);
export const json = (method: string, body?: unknown): RequestInit => ({ method, body: body === undefined ? undefined : JSON.stringify(body) });
export const inr = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format;
/** The app whose header opened the portal (its root and name, for links and breadcrumbs). */
export const useApp = () => appOf(useLocation().pathname);
