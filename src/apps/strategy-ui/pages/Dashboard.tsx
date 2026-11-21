import { Building2, Calendar, IndianRupee, ScrollText, User as UserIcon } from 'lucide-react';
import { Link, useSearchParams } from 'react-router';
import { card, Notice } from '@/shared';
import { todayIst, roleLabel, useApp, useScope } from '../api';

// The old app's order and colours: engine logs first (admin only), then account logs.
const LOG_BUTTONS = [
  ['engine_success', 'Engine Success Logs', 'bg-teal-600 hover:bg-teal-700'],
  ['engine_warning', 'Engine Warning Logs', 'bg-orange-600 hover:bg-orange-700'],
  ['engine_error', 'Engine Error Logs', 'bg-rose-600 hover:bg-rose-700'],
  ['account_success', 'Account Success Logs', 'bg-emerald-600 hover:bg-emerald-700'],
  ['account_warning', 'Account Warning Logs', 'bg-amber-600 hover:bg-amber-700'],
  ['account_error', 'Account Error Logs', 'bg-red-600 hover:bg-red-700'],
] as const;

const control = 'h-10 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm focus:ring-2 focus:ring-blue-100 focus:outline-none';
const tile = 'flex min-h-14 items-center justify-center gap-2 rounded-lg px-4 text-center font-medium text-white shadow-sm transition';

// Logs Dashboard: pick a user and a date, then open a log type, the PnL analysis or the broker portal.
export function Component() {
  const app = useApp();
  const { root: ROOT, name: NAME } = app;
  const { db, user, users, usersQuery, date, qs } = useScope();
  const [, setParams] = useSearchParams();
  const set = (k: 'user' | 'date', v: string) => setParams(new URLSearchParams({ ...(user && { user: String(user.user_id) }), date, [k]: v }));

  if (usersQuery.error) return <Notice>{usersQuery.error.message}</Notice>;
  const isAdmin = user?.role.toLowerCase() === 'admin';
  // A database with no users yet (a fresh live one) has nobody to gate on: its engine logs are open; account logs need a user.
  const buttons = LOG_BUTTONS.filter(([t]) => (user ? isAdmin || t.startsWith('account_') : !t.startsWith('account_')));
  const showLogs = !!user || (usersQuery.isSuccess && users.length === 0);
  const base = ROOT;

  return (
    <div className="w-full space-y-4">
      {/* Full width: title left, filters right on wide screens; stacked on phones. */}
      <section className={`${card} flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between`}>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{NAME}</h1>
          <p className="mt-1 text-sm text-zinc-500">Logs Dashboard · {db}</p>
        </div>
        <div className="grid w-full gap-4 sm:grid-cols-2 lg:w-auto lg:min-w-[36rem]">
          <label className="block">
            <span className="mb-1.5 flex items-center gap-2 text-sm font-medium text-zinc-700">
              <UserIcon className="size-4" /> User
            </span>
            <select value={user?.user_id ?? ''} disabled={!users.length} onChange={(e) => set('user', e.target.value)} className={control}>
              {!users.length && <option value="">{usersQuery.isPending ? 'Loading…' : 'No users'}</option>}
              {users.map((u) => (
                <option key={u.user_id} value={u.user_id}>
                  {u.full_name} ({roleLabel(u.role)})
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-1.5 flex items-center gap-2 text-sm font-medium text-zinc-700">
              <Calendar className="size-4" /> Date
            </span>
            <input type="date" value={date} max={todayIst()} onChange={(e) => e.target.value && set('date', e.target.value)} className={control} />
          </label>
        </div>
      </section>

      {showLogs && (
        <section className={card}>
          <h2 className="mb-3 flex items-center gap-2 text-base font-semibold">
            <ScrollText className="size-5" /> Select Log Type
          </h2>
          <div className={`grid gap-3 sm:grid-cols-2 lg:grid-cols-3 ${buttons.length > 3 ? '2xl:grid-cols-6' : ''}`}>
            {buttons.map(([t, label, color]) => (
              <Link key={t} to={`${base}/logs/${t}${qs()}`} className={`${tile} ${color}`}>
                {label}
              </Link>
            ))}
          </div>
        </section>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        {user && (
          <section className={card}>
            <h2 className="mb-3 flex items-center gap-2 text-base font-semibold">
              <IndianRupee className="size-5" /> Profit &amp; Loss Analysis
            </h2>
            <Link to={`${base}/pnl/weekly${qs()}`} className={`${tile} bg-teal-500 hover:bg-teal-600`}>
              <Calendar className="size-5" /> Weekly PnL &amp; Analysis
            </Link>
          </section>
        )}
        <section className={card}>
          <h2 className="mb-3 flex items-center gap-2 text-base font-semibold">
            <Building2 className="size-5" /> Broker Services
          </h2>
          <Link to={`${ROOT}/broker`} className={`${tile} bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-700 hover:to-violet-700`}>
            <Building2 className="size-5" /> Broker Portal
          </Link>
        </section>
      </div>
    </div>
  );
}
