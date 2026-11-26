import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, UserRound } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router';
import { brokerLabel, btn, card, ConfirmDelete, Crumbs, RowActions, Toggle, dbApi, isAdmin, type Status, type User, usersTrail, useUsers, MissingProject } from '../../users';

const statuses: { key: Status; head: string }[] = [
  { key: 'is_active', head: 'Status' },
  { key: 'account_status', head: 'Account Status' },
  { key: 'trade_status', head: 'Trade Status' },
];

export function Component() {
  const { project: p, data, isPending, error } = useUsers();
  const qc = useQueryClient();
  const [confirming, setConfirming] = useState<User | null>(null);

  const refresh = () => qc.invalidateQueries({ queryKey: ['users', p?.db] });
  // Only the flags this project's engine has (a single-variant engine may lack some: they come back null).
  const shown = statuses.filter((s) => !data?.length || data.some((u) => u[s.key] !== null));
  const toggle = useMutation({
    mutationFn: (v: { user_id: number; status_type: Status; value: number }) =>
      dbApi(p!.db, '/api/toggle_user_status', { method: 'PUT', body: JSON.stringify(v) }),
    onSettled: refresh,
  });
  const remove = useMutation({
    mutationFn: (user_id: number) => dbApi(p!.db, '/api/delete_user', { method: 'DELETE', body: JSON.stringify({ user_id }) }),
    onSuccess: () => setConfirming(null),
    onSettled: refresh,
  });

  if (!p) return <MissingProject />;
  const err = (toggle.error ?? remove.error)?.message;

  return (
    <>
      <Crumbs items={[...usersTrail(p).slice(0, 3), { label: 'Users' }]} />
      <section className={card}>
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="flex items-center gap-2 text-base font-semibold">
            <UserRound className="size-4" /> Users Management · {p.name}
          </h2>
          <Link to="new" className={`${btn.success} ml-auto`}>
            <Plus className="size-4" /> Add User
          </Link>
        </div>

        {err && <p className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{err}</p>}

        {isPending ? (
          <p className="mt-5 py-8 text-center text-sm text-zinc-400">Loading…</p>
        ) : error ? (
          <p className="mt-5 py-8 text-center text-sm text-red-600">{error.message}</p>
        ) : data.length === 0 ? (
          <p className="mt-5 rounded-lg border border-zinc-200 py-8 text-center text-sm text-zinc-400">No users yet.</p>
        ) : (
          <div className="mt-5 overflow-x-auto rounded-lg border border-zinc-200">
            <table className="w-full text-center text-sm">
              <thead className="border-b border-zinc-200 bg-zinc-50 text-xs font-medium tracking-wider text-zinc-500 uppercase">
                <tr className="divide-x divide-zinc-200">
                  <th className="px-3 py-3">Sr</th>
                  <th className="px-3 py-3">Name</th>
                  <th className="px-3 py-3">Mobile</th>
                  <th className="px-3 py-3">Broker</th>
                  {shown.map((s) => (
                    <th key={s.key} className="px-3 py-3 whitespace-nowrap">
                      {s.head}
                    </th>
                  ))}
                  <th className="px-3 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200">
                {data.map((u: User, i) => (
                  <tr key={u.user_id} className="divide-x divide-zinc-200 hover:bg-zinc-50">
                    <td className="px-3 py-3">{i + 1}</td>
                    <td className="px-3 py-3 font-medium whitespace-nowrap">
                      <Link to={String(u.user_id)} className="hover:underline">
                        {u.full_name}
                      </Link>
                      {isAdmin(u) && <span className="ml-1 text-zinc-500">(Admin)</span>}
                    </td>
                    <td className="px-3 py-3 tabular-nums">{u.mobile}</td>
                    <td className="px-3 py-3">{brokerLabel(u.broker)}</td>
                    {shown.map((s) => (
                      <td key={s.key} className="px-3 py-3 text-center">
                        <Toggle
                          on={!!u[s.key]}
                          label={`${s.head} for ${u.full_name}`}
                          disabled={toggle.isPending}
                          onChange={() => toggle.mutate({ user_id: u.user_id, status_type: s.key, value: u[s.key] ? 0 : 1 })}
                        />
                      </td>
                    ))}
                    <td className="px-3 py-2 text-center whitespace-nowrap">
                      <RowActions name={u.full_name} view={String(u.user_id)} edit={`${u.user_id}/edit`} onDelete={() => setConfirming(u)} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <ConfirmDelete
        noun="user"
        name={confirming?.full_name ?? null}
        pending={remove.isPending}
        error={remove.error}
        onConfirm={() => confirming && remove.mutate(confirming.user_id)}
        onCancel={() => setConfirming(null)}
      />
    </>
  );
}
