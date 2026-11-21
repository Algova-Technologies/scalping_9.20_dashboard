import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { LogIn, Trash2, User } from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { card, ConfirmDelete, Crumbs } from '@/shared';
import { bapi, inr, json, useApp } from '../../api';
import { BROKERS, brokerById, PORTAL_USER, type ResultsState } from '../../brokers';

type Saved = {
  saved_account_id: number; broker_type: string; broker_user_id: string; full_name: string; email: string; phone: string;
  account_type: string; account_status: string; kyc_status: string; available_balance: number; withdrawable_balance: number;
  utilized_margin: number; total_margin: number; currency: string; last_login_at: string | null;
};

// Broker Portal: saved accounts (open a stored snapshot) and the brokers to connect.
export function Component() {
  const app = useApp();
  const { root: ROOT, name: NAME } = app;
  const navigate = useNavigate();
  const qc = useQueryClient();
  const key = ['su', 'saved-accounts'];
  const saved = useQuery({ queryKey: key, queryFn: () => bapi<Saved[]>(`saved-accounts/${PORTAL_USER}`) });
  const [deleting, setDeleting] = useState<Saved | null>(null);
  const remove = useMutation({
    mutationFn: (s: Saved) => bapi(`saved-accounts/${s.saved_account_id}`, json('DELETE')),
    onSuccess: () => {
      setDeleting(null);
      qc.invalidateQueries({ queryKey: key });
    },
  });
  const open = useMutation({
    mutationFn: (s: Saved) => bapi<{ account_details: Saved }>('quick-login', json('POST', { saved_account_id: s.saved_account_id })),
    onSuccess: ({ account_details: a }) => {
      const state: ResultsState = {
        sessionToken: 'saved-account',
        userId: a.broker_user_id,
        brokerType: a.broker_type,
        saved: {
          profile: { ...a, client_id: a.broker_user_id },
          balance: { ...a, last_updated: a.last_login_at },
        },
      };
      navigate(`${ROOT}/broker/${a.broker_type}/results`, { state });
    },
  });

  return (
    <>
      <Crumbs items={[{ label: NAME, to: ROOT }, { label: 'Broker Portal' }]} />
      <section className={card}>
        <h1 className="text-center text-2xl font-semibold tracking-tight">Broker Portal</h1>
        <p className="mt-1 text-center text-sm text-zinc-500">Select your broker to view your account profile and balance information</p>
      </section>

      {(open.error || saved.error) && <p className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{(open.error ?? saved.error)!.message}</p>}
      {!!saved.data?.length && (
        <section className={`${card} mt-4`}>
          <h2 className="mb-4 text-lg font-semibold">Saved Accounts</h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {saved.data.map((s) => {
              const b = brokerById(s.broker_type);
              const Icon = b?.icon ?? User;
              return (
                <div key={s.saved_account_id} className="rounded-lg border border-zinc-200 p-4">
                  <div className="mb-3 flex items-center gap-3">
                    <span className={`inline-flex size-10 items-center justify-center rounded-full bg-gradient-to-r ${b?.gradient ?? 'from-zinc-500 to-zinc-600'}`}>
                      <Icon className="size-5 text-white" />
                    </span>
                    <div className="min-w-0">
                      <h3 className="truncate font-semibold">{s.full_name || s.broker_user_id}</h3>
                      <p className="text-sm text-zinc-500">{b?.name ?? s.broker_type}</p>
                    </div>
                    <button onClick={() => setDeleting(s)} title="Delete account" aria-label={`Delete saved account ${s.broker_user_id}`} className="ml-auto rounded-md p-2 text-red-600 hover:bg-red-50">
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                  <dl className="space-y-1.5 text-sm">
                    <div className="flex justify-between"><dt className="text-zinc-500">Client ID:</dt><dd className="font-medium">{s.broker_user_id}</dd></div>
                    <div className="flex justify-between"><dt className="text-zinc-500">Balance:</dt><dd className="font-medium text-emerald-600">{inr(s.available_balance)}</dd></div>
                    <div className="flex justify-between"><dt className="text-zinc-500">Last Login:</dt><dd className="font-medium">{s.last_login_at ? new Date(`${s.last_login_at}Z`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}</dd></div>
                  </dl>
                  <button onClick={() => open.mutate(s)} disabled={open.isPending} className="mt-3 inline-flex h-8 w-full items-center justify-center gap-2 rounded-md bg-blue-50 text-sm font-medium text-blue-700 hover:bg-blue-100">
                    <LogIn className="size-4" /> Open
                  </button>
                </div>
              );
            })}
          </div>
        </section>
      )}

      <section className={`${card} mt-4`}>
        <h2 className="mb-4 text-lg font-semibold">Connect New Broker</h2>
        <div className="grid gap-6 md:grid-cols-3">
          {BROKERS.map((b) => (
            <Link key={b.id} to={`${ROOT}/broker/${b.id}/login`} className={`rounded-xl border-2 p-6 text-center transition hover:scale-[1.02] hover:shadow-lg ${b.panel}`}>
              <span className={`mb-4 inline-flex size-16 items-center justify-center rounded-full bg-gradient-to-r ${b.gradient}`}>
                <b.icon className="size-8 text-white" />
              </span>
              <h3 className="mb-2 text-xl font-bold">{b.name}</h3>
              <p className="mb-6 text-sm text-zinc-600">{b.description}</p>
              <span className={`block w-full rounded-lg bg-gradient-to-r px-4 py-3 font-semibold text-white shadow-md ${b.gradient}`}>Connect to {b.name}</span>
            </Link>
          ))}
        </div>
      </section>

      <ConfirmDelete
        noun="saved account"
        name={deleting ? `${deleting.full_name || deleting.broker_user_id} (${brokerById(deleting.broker_type)?.name ?? deleting.broker_type})` : null}
        pending={remove.isPending}
        error={remove.error}
        onConfirm={() => deleting && remove.mutate(deleting)}
        onCancel={() => setDeleting(null)}
      />
    </>
  );
}
