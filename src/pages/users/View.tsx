import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Eye, EyeOff, Pencil, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { brokerLabel, btn, card, CardHeader, Crumbs, dbApi, isAdmin, Notice, usersTrail, useUsers, MissingProject, actionBtn } from '../../users';
import { projectUrl } from '@/apps';

const Badge = ({ on }: { on: number }) => (
  <span className={`rounded px-2 py-0.5 text-xs font-semibold ${on ? 'bg-emerald-50 text-emerald-700' : 'bg-zinc-100 text-zinc-500'}`}>
    {on ? 'On' : 'Off'}
  </span>
);

export function Component() {
  const { project: p, user: u, isPending, error } = useUsers();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [showPw, setShowPw] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const remove = useMutation({
    mutationFn: () => dbApi(p!.db, '/api/delete_user', { method: 'DELETE', body: JSON.stringify({ user_id: u!.user_id }) }),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['users', p!.db] });
      navigate(`${projectUrl(p!.id)}/users`);
    },
  });

  if (!p) return <MissingProject />;
  if (isPending) return <Notice>Loading…</Notice>;
  if (error) return <Notice>{error.message}</Notice>;
  if (!u) return <Notice>User not found.</Notice>;

  const rows: [string, React.ReactNode][] = [
    ['First Name', u.first_name],
    ['Last Name', u.last_name],
    ['Email', u.email],
    ['Mobile', u.mobile],
    ['Role', isAdmin(u) ? 'Admin' : 'User'],
    ['Broker', brokerLabel(u.broker)],
    ['Client ID', u.client_id],
    [
      'Password',
      <span className="inline-flex items-center gap-2">
        <span className="font-mono">{showPw ? u.password : '••••••••'}</span>
        <button onClick={() => setShowPw((s) => !s)} aria-label={showPw ? 'Hide password' : 'Show password'} className="text-zinc-400 hover:text-zinc-700">
          {showPw ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
        </button>
      </span>,
    ],
    ['API Key', <span className="font-mono break-all">{u.api_key}</span>],
    ['TOTP Token', <span className="font-mono break-all">{u.qr_totp_token}</span>],
    ['Buying Power', u.buying_power && u.buying_power !== '0' ? Number(u.buying_power).toLocaleString('en-IN') : '—'],
    ['Status', <Badge on={u.is_active} />],
    ['Account Status', <Badge on={u.account_status} />],
    ['Trade Status', <Badge on={u.trade_status} />],
  ];

  return (
    <>
      <Crumbs items={[...usersTrail(p), { label: u.full_name }]} />
      <section className={card}>
        <CardHeader
          back={`${projectUrl(p.id)}/users`}
          title={
            <>
              {u.full_name}
              {isAdmin(u) && <span className="ml-1 font-normal text-zinc-500">(Admin)</span>}
            </>
          }
        >
          {confirming ? (
            <>
              <span className="text-sm text-zinc-700">Delete this user permanently?</span>
              <button onClick={() => remove.mutate()} disabled={remove.isPending} className={btn.danger}>
                {remove.isPending ? 'Deleting…' : 'Yes, delete'}
              </button>
              <button onClick={() => setConfirming(false)} className={btn.secondary}>
                Cancel
              </button>
            </>
          ) : (
            <>
              <Link to="edit" title="Edit" aria-label={`Edit ${u.full_name}`} className={actionBtn.edit}>
                <Pencil className="size-4" />
              </Link>
              <button onClick={() => setConfirming(true)} title="Delete" aria-label={`Delete ${u.full_name}`} className={actionBtn.delete}>
                <Trash2 className="size-4" />
              </button>
            </>
          )}
        </CardHeader>
        {remove.error && <p className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{remove.error.message}</p>}

        {/* Plain value-over-label pairs; flex-col-reverse keeps <dt> first for screen readers. */}
        <dl className="mt-6 grid gap-x-5 gap-y-6 md:grid-cols-2 xl:grid-cols-4">
          {rows.map(([k, v]) => (
            <div key={k} className="flex min-w-0 flex-col-reverse">
              <dt className="mt-1 text-xs font-medium tracking-wider text-zinc-500 uppercase">{k}</dt>
              <dd className="text-base font-medium break-words text-zinc-900">{v}</dd>
            </div>
          ))}
        </dl>
      </section>
    </>
  );
}
