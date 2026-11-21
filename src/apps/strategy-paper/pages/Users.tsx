import { useMutation, useQueryClient } from '@tanstack/react-query';
import { CandlestickChart, Eye, Pencil, Plus, Trash2, UserRound } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router';
import { actionBtn, btn, card, ConfirmDelete, Crumbs, Notice, Toggle } from '@/shared';
import { isMaster, json, papi, trail, useApp, type User, userLabel, useScope } from '../api';

type Status = 'broker_connection_status' | 'account_status' | 'trade_status';
const statuses = (word: string): { key: Status; head: string }[] => [
  { key: 'broker_connection_status', head: 'Broker Connection Status' },
  { key: 'account_status', head: 'Account Status' },
  { key: 'trade_status', head: `${word} Trade Status` },
];

// Users Management: switches per user (the master's Paper/Live Trade Status is always on, so hidden), view / trades / edit / delete.
export function Component() {
  const app = useApp();
  const { root: ROOT } = app;
  const STATUS = statuses(app.word);
  const { users, usersQuery, qs } = useScope();
  const qc = useQueryClient();
  const [deleting, setDeleting] = useState<User | null>(null);
  const refresh = () => qc.invalidateQueries({ queryKey: [app.api, 'users'] });
  const toggle = useMutation({
    mutationFn: ({ u, key }: { u: User; key: Status }) => papi(app, `users/${u.user_id}/status`, json('PATCH', { status_type: key, value: u[key] ? 0 : 1 })),
    // Stop a refresh in flight first, so the 1s poll can't flip the switch back before the save lands.
    onMutate: async ({ u, key }) => {
      await qc.cancelQueries({ queryKey: [app.api, 'users'] });
      qc.setQueryData<User[]>([app.api, 'users'], (old) => old?.map((x) => (x.user_id === u.user_id ? { ...x, [key]: u[key] ? 0 : 1 } : x)));
    },
    onSettled: refresh,
  });
  const remove = useMutation({
    mutationFn: (u: User) => papi(app, `users/${u.user_id}`, json('DELETE')),
    onSuccess: () => {
      setDeleting(null);
      refresh();
    },
  });

  return (
    <>
      <Crumbs items={[...trail(app, qs()), { label: 'Users' }]} />
      <section className={card}>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="flex items-center gap-2 text-lg font-semibold"><UserRound className="size-5" /> Users Management</h1>
          <Link to={`${ROOT}/users/new`} className={`${btn.primary} ml-auto`}><Plus className="size-4" /> Add User</Link>
        </div>
        {toggle.error && <p className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{toggle.error.message}</p>}
        {usersQuery.isPending ? (
          <p className="py-8 text-center text-sm text-zinc-400">Loading users…</p>
        ) : usersQuery.error ? (
          <div className="mt-4"><Notice>{usersQuery.error.message}</Notice></div>
        ) : users.length === 0 ? (
          <p className="py-8 text-center text-sm text-zinc-500">No users found. Add a user to get started.</p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full border border-zinc-200 text-sm">
              <thead className="bg-zinc-50 text-xs font-medium tracking-wide text-zinc-600 uppercase">
                <tr className="divide-x divide-zinc-200">
                  {['Sr', 'Name', 'Mobile', 'Broker'].map((h) => <th key={h} className="px-4 py-3 text-left whitespace-nowrap">{h}</th>)}
                  {[...STATUS.map((s) => s.head), 'Action'].map((h) => <th key={h} className="px-4 py-3 whitespace-nowrap">{h}</th>)}
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200">
                {users.map((u, i) => (
                  <tr key={u.user_id} className="divide-x divide-zinc-200 hover:bg-zinc-50">
                    <td className="px-4 py-3">{i + 1}</td>
                    <td className="px-4 py-3 font-medium whitespace-nowrap">{userLabel(app)(u)}</td>
                    <td className="px-4 py-3 tabular-nums">{u.mobile}</td>
                    <td className="px-4 py-3 whitespace-nowrap">{u.broker_name}</td>
                    {STATUS.map((s) => (
                      <td key={s.key} className="px-4 py-3 text-center">
                        {s.key === 'trade_status' && isMaster(u) ? (
                          <span className="text-xs text-zinc-400" title={`The master always ${app.mode}-trades`}>Always on</span>
                        ) : (
                          <Toggle on={u[s.key] === 1} label={`${s.head} for ${u.full_name}`} disabled={toggle.isPending} onChange={() => toggle.mutate({ u, key: s.key })} />
                        )}
                      </td>
                    ))}
                    <td className="px-4 py-3">
                      <span className="flex items-center justify-center gap-2">
                        <Link to={`${ROOT}/users/${u.user_id}`} title="View" aria-label={`View ${u.full_name}`} className={actionBtn.view}><Eye className="size-4" /></Link>
                        <Link to={`${ROOT}/pnl/weekly?user=${u.user_id}`} title="Trades" aria-label={`Trades of ${u.full_name}`} className={`${actionBtn.view} bg-emerald-600 hover:bg-emerald-700 focus:ring-emerald-300`}><CandlestickChart className="size-4" /></Link>
                        <Link to={`${ROOT}/users/${u.user_id}/edit`} title="Edit" aria-label={`Edit ${u.full_name}`} className={actionBtn.edit}><Pencil className="size-4" /></Link>
                        <button onClick={() => setDeleting(u)} title="Delete" aria-label={`Delete ${u.full_name}`} className={actionBtn.delete}><Trash2 className="size-4" /></button>
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
      <ConfirmDelete noun="user" name={deleting?.full_name ?? null} pending={remove.isPending} error={remove.error}
        onConfirm={() => deleting && remove.mutate(deleting)} onCancel={() => { setDeleting(null); remove.reset(); }} />
    </>
  );
}
