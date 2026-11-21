import { useSearchParams } from 'react-router';
import type { ReactNode } from 'react';
import { card } from '@/shared';

// Shared pieces of the strategy apps' Weekly → Daily → Trades PnL screens (src/apps/*).

export type Tile = { label: string; value: ReactNode; cls: string };
export function Tiles({ items, cols = 'lg:grid-cols-6' }: { items: Tile[]; cols?: string }) {
  return (
    <div className={`grid grid-cols-2 gap-3 md:grid-cols-3 ${cols}`}>
      {items.map((t) => (
        <div key={t.label} className={`rounded-lg p-3 text-center ${t.cls}`}>
          <div className="text-xl font-bold tabular-nums">{t.value}</div>
          <div className="text-xs">{t.label}</div>
        </div>
      ))}
    </div>
  );
}

export function Section({ title, icon, children }: { title: string; icon: ReactNode; children: ReactNode }) {
  return (
    <section className={`${card} mt-4`}>
      <h2 className="mb-4 flex items-center gap-2 text-base font-semibold">
        {icon} {title}
      </h2>
      {children}
    </section>
  );
}

export type Col<R> = { head: string; cell: (r: R) => ReactNode; cls?: (r: R) => string };
export function Table<R>({ cols, rows, rowKey }: { cols: Col<R>[]; rows: R[]; rowKey: (r: R) => string | number }) {
  return (
    <div className="mt-5 overflow-x-auto">
      <table className="w-full border border-zinc-200 text-center text-sm">
        <thead className="bg-zinc-50 text-xs font-medium tracking-wide text-zinc-500 uppercase">
          <tr className="divide-x divide-zinc-200">
            {cols.map((c) => (
              <th key={c.head} className="px-3 py-3 whitespace-nowrap">
                {c.head}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-200">
          {rows.map((r) => (
            <tr key={rowKey(r)} className="divide-x divide-zinc-200 hover:bg-zinc-50">
              {cols.map((c) => (
                <td key={c.head} className={`px-3 py-2.5 whitespace-nowrap tabular-nums ${c.cls?.(r) ?? ''}`}>
                  {c.cell(r)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

type Person = { user_id: number; full_name: string };
/** User dropdown that swaps ?user= and keeps every other query param. `label` names each option. */
export function UserPicker<U extends Person>({ user, users, label }: { user?: U; users: U[]; label: (u: U) => string }) {
  const [sp, setSp] = useSearchParams();
  return (
    <select
      aria-label="User"
      value={user?.user_id ?? ''}
      onChange={(e) => setSp(new URLSearchParams({ ...Object.fromEntries(sp), user: e.target.value }))}
      className="h-8 rounded-md border border-zinc-300 bg-white px-2 text-sm text-zinc-700 focus:ring-2 focus:ring-blue-100 focus:outline-none"
    >
      {users.map((u) => (
        <option key={u.user_id} value={u.user_id}>
          {label(u)}
        </option>
      ))}
    </select>
  );
}
