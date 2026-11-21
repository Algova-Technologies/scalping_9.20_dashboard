import { useMutation, useQuery } from '@tanstack/react-query';
import { AlertCircle, Building2, Check, IndianRupee, Loader, RefreshCw, Save, TrendingUp, User } from 'lucide-react';
import type { ReactNode } from 'react';
import { Link, useLocation, useParams } from 'react-router';
import { btn, card, Crumbs, Notice } from '@/shared';
import { bapi, inr, json, useApp } from '../../api';
import { type Balance, brokerById, PORTAL_USER, type Profile, type ResultsState } from '../../brokers';

// Profile + balance of a logged-in broker session (live), or of a saved snapshot (as stored).
export function Component() {
  const app = useApp();
  const { root: ROOT, name: NAME } = app;
  const { broker: id } = useParams();
  const b = brokerById(id);
  const s = useLocation().state as ResultsState | null;
  const live = !!s && !s.saved;
  const auth = { headers: { Authorization: `Bearer ${s?.sessionToken}` } };
  const q = useQuery({
    queryKey: ['su', 'broker', id, s?.sessionToken],
    queryFn: async () => {
      const [p, bal] = await Promise.all([
        bapi<{ profile: Profile }>(`${id}/profile`, auth),
        bapi<{ balance: Balance }>(`${id}/balance`, auth),
      ]);
      return { profile: p.profile, balance: bal.balance };
    },
    enabled: live && !!b,
    // The one screen that does NOT auto-refresh: each fetch is a live Angel/Dhan API call and those
    // are rate limited, so it refreshes only from the Refresh button.
    staleTime: Infinity,
    refetchInterval: false,
  });
  const data = s?.saved ?? q.data;
  const save = useMutation({
    mutationFn: () =>
      bapi('save-account', json('POST', {
        user_id: PORTAL_USER,
        broker_type: s!.brokerType,
        broker_user_id: data!.profile.client_id || s!.userId,
        ...Object.fromEntries(['full_name', 'email', 'phone', 'account_type', 'account_status', 'kyc_status'].map((k) => [k, data!.profile[k as keyof Profile] ?? ''])),
        ...Object.fromEntries(['available_balance', 'withdrawable_balance', 'utilized_margin', 'total_margin'].map((k) => [k, data!.balance[k as keyof Balance] ?? 0])),
        currency: data!.balance.currency ?? 'INR',
      })),
  });

  const back = (
    <Link to={`${ROOT}/broker`} className={btn.secondary}>
      Back to Broker Selection
    </Link>
  );
  if (!b || !s)
    return (
      <Notice>
        No session found. Please login again to access your broker information.
        <span className="mt-4 block">{back}</span>
      </Notice>
    );
  if (live && q.isPending)
    return (
      <Notice>
        <Loader className="mx-auto mb-3 size-8 animate-spin text-blue-600" />
        Fetching your broker information…
      </Notice>
    );
  if (q.error || !data)
    return (
      <Notice>
        <AlertCircle className="mx-auto mb-3 size-10 text-red-500" />
        {q.error?.message ?? 'Failed to fetch data'}
        <span className="mt-4 flex justify-center gap-3">
          <button onClick={() => q.refetch()} className={btn.primary}>Try Again</button>
          {back}
        </span>
      </Notice>
    );

  const { profile: p, balance: bal } = data;
  const info = (label: string, value?: string | null) => (
    <div>
      <p className="text-lg font-semibold">{value || 'N/A'}</p>
      <p className="text-sm text-zinc-500">{label}</p>
    </div>
  );
  const money = (label: string, value: number, note: string, badge: string, cls: string, icon: ReactNode) => (
    <div className={`rounded-lg border p-4 ${cls}`}>
      <div className="mb-2 flex items-center justify-between">
        {icon}
        <span className="rounded-full bg-white/60 px-2 py-0.5 text-xs">{badge}</span>
      </div>
      <p className="text-2xl font-bold tabular-nums">{inr(value || 0)}</p>
      <h3 className="font-semibold">{label}</h3>
      <p className="text-sm opacity-80">{note}</p>
    </div>
  );

  return (
    <>
      <Crumbs
        items={[{ label: NAME, to: ROOT }, { label: 'Broker Portal', to: `${ROOT}/broker` }, { label: `${b.name} - Account Information` }]}
        right={
          <div className="flex items-center gap-3">
            {live && (
              <button onClick={() => q.refetch()} disabled={q.isFetching} className={btn.secondary}>
                <RefreshCw className={`size-4 ${q.isFetching ? 'animate-spin' : ''}`} /> {q.isFetching ? 'Refreshing...' : 'Refresh'}
              </button>
            )}
            {live ? (
              <button onClick={() => save.mutate()} disabled={save.isPending || save.isSuccess} className={save.isSuccess ? btn.success : btn.primary}>
                {save.isSuccess ? <><Check className="size-4" /> Saved!</> : save.isPending ? <><Loader className="size-4 animate-spin" /> Saving...</> : <><Save className="size-4" /> Save Details</>}
              </button>
            ) : (
              <span className={btn.success}><Check className="size-4" /> Saved Account</span>
            )}
          </div>
        }
      />
      {save.error && <p className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">Failed to save broker data: {save.error.message}</p>}

      <section className={`rounded-xl border-2 p-6 ${b.panel}`}>
        <h2 className="mb-4 flex items-center gap-2 text-xl font-bold"><User className="size-6" /> Profile Information</h2>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {info('Full Name', p.full_name)}
          {info('Email Address', p.email)}
          {info('Account Status', p.account_status)}
          {info('Client ID', p.client_id)}
          {info('Mobile Number', p.phone)}
          {info('KYC Status', p.kyc_status)}
        </div>
      </section>

      <section className={`${card} mt-4`}>
        <h2 className="mb-5 flex items-center gap-2 text-xl font-bold"><IndianRupee className="size-6" /> Account Balance</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {money('Available Balance', bal.available_balance, 'Ready for trading', 'Available', 'border-emerald-200 bg-emerald-50 text-emerald-700', <TrendingUp className="size-5" />)}
          {money('Withdrawable Balance', bal.withdrawable_balance, 'Can be withdrawn', 'Withdrawable', 'border-cyan-200 bg-cyan-50 text-cyan-700', <IndianRupee className="size-5" />)}
          {money('Utilized Margin', bal.utilized_margin, 'Currently in use', 'In Use', 'border-orange-200 bg-orange-50 text-orange-700', <TrendingUp className="size-5" />)}
          {money('Total Margin', bal.total_margin, 'Total account value', 'Total', 'border-blue-200 bg-blue-50 text-blue-700', <Building2 className="size-5" />)}
        </div>
      </section>

      <section className={`${card} mt-4`}>
        <h2 className="mb-5 text-xl font-bold">Account Summary</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4">{info('Account Type', p.account_type)}</div>
          <div className="rounded-lg border border-orange-200 bg-orange-50 p-4 text-orange-700">
            {info('Margin Utilization', `${bal.total_margin > 0 ? ((bal.utilized_margin / bal.total_margin) * 100).toFixed(1) : 0}%`)}
          </div>
          <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 text-blue-700">
            {info('Last Updated', bal.last_updated ? new Date(bal.last_updated.endsWith('Z') ? bal.last_updated : `${bal.last_updated}Z`).toLocaleString('en-IN') : null)}
          </div>
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-emerald-700">{info('Trading Status', 'Enabled')}</div>
        </div>
      </section>
    </>
  );
}
