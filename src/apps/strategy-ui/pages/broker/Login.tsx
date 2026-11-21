import { useMutation, useQuery } from '@tanstack/react-query';
import { AlertCircle, Eye, EyeOff, HelpCircle, Loader, RefreshCw, Shield, Users } from 'lucide-react';
import { type ChangeEvent, type ReactNode, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { card, Crumbs, Notice } from '@/shared';
import { bapi, json, useApp } from '../../api';
import { brokerById, type ResultsState } from '../../brokers';

type Stored = { user_id: string; client_id: string; full_name: string | null; email: string | null; account_status: string | null; available_balance: number | null };
type LoginRes = { success: boolean; message: string; session_token?: string; user_id?: string; broker_type?: string; requires_oauth2?: boolean; auth_url?: string };
type FormKey = 'apiKey' | 'clientId' | 'password' | 'totp';

const input = 'h-10 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm focus:ring-2 focus:ring-blue-100 focus:outline-none';

// Login to one broker. Stored users (accounts that logged in here before) can auto-fill the form.
export function Component() {
  const app = useApp();
  const { root: ROOT, name: NAME } = app;
  const { broker: id } = useParams();
  const b = brokerById(id);
  const navigate = useNavigate();
  const [form, setForm] = useState<Record<FormKey, string>>({ apiKey: '', clientId: '', password: '', totp: '' });
  const [secret, setSecret] = useState(''); // Angel: base32 TOTP secret, only to generate the code
  const [show, setShow] = useState({ password: false, totp: false });
  const [showStored, setShowStored] = useState(false);
  const [remaining, setRemaining] = useState(0);
  const [error, setError] = useState('');

  const stored = useQuery({ queryKey: ['su', 'stored', id], queryFn: () => bapi<{ stored_users: Stored[] }>(`${id}/stored-users`), enabled: !!b });
  useEffect(() => {
    if (remaining <= 0) return;
    const t = setTimeout(() => setRemaining((r) => r - 1), 1000);
    return () => clearTimeout(t);
  }, [remaining]);

  const autofill = useMutation({
    mutationFn: (u: Stored) => bapi<{ credentials: { api_key: string; client_id: string } }>(`${id}/stored-user/${encodeURIComponent(u.user_id)}/credentials`),
    onSuccess: ({ credentials: c }) => {
      setForm({ apiKey: c.api_key ?? '', clientId: c.client_id ?? '', password: '', totp: '' }); // MPIN and TOTP are never stored
      setShowStored(false);
      setError('');
    },
    onError: () => setError('Failed to load stored user credentials'),
  });
  const totp = useMutation({
    mutationFn: () => bapi<{ totp_code: string; remaining_time: number }>('angel/generate-totp', json('POST', { secret_key: secret })),
    onSuccess: (r) => {
      setForm((f) => ({ ...f, totp: r.totp_code }));
      setRemaining(r.remaining_time);
    },
    onError: (e) => setError(e.message),
  });
  const login = useMutation({
    mutationFn: () => bapi<LoginRes>(`${id}/login`, json('POST', { api_key: form.apiKey, client_id: form.clientId, password: form.password, totp: form.totp || null })),
    onSuccess: (r) => {
      if (r.requires_oauth2 && r.auth_url) return void (window.location.href = r.auth_url); // Upstox: continue on its site
      if (!r.success) return setError(r.message || 'Login failed');
      const state: ResultsState = { sessionToken: r.session_token!, userId: r.user_id!, brokerType: r.broker_type! };
      navigate(`${ROOT}/broker/${id}/results`, { state });
    },
    onError: (e) => setError(e.message || 'Login failed. Please check your credentials.'),
  });

  if (!b) return <Notice>Broker not found.</Notice>;
  const set = (k: FormKey) => (e: ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [k]: e.target.value });
    setError('');
  };
  const label = (k: FormKey) => {
    const f = b.fields[k]!;
    return (
      <span className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-zinc-700">
        {f.label} <span className="text-red-500">*</span>
        <span title={f.help} className="cursor-help">
          <HelpCircle aria-label={f.help} className="size-4 text-zinc-400" />
        </span>
      </span>
    );
  };
  const secretInput = (k: 'password' | 'totp', extra?: ReactNode) => (
    <div className="relative">
      <input type={show[k] ? 'text' : 'password'} required value={form[k]} onChange={set(k)} placeholder={b.fields[k]!.placeholder} autoComplete="off" className={`${input} pr-10`} />
      {extra}
      <button type="button" onClick={() => setShow({ ...show, [k]: !show[k] })} aria-label={show[k] ? 'Hide' : 'Show'} className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-zinc-400">
        {show[k] ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
      </button>
    </div>
  );
  const users = stored.data?.stored_users ?? [];

  return (
    <>
      <Crumbs items={[{ label: NAME, to: ROOT }, { label: 'Broker Portal', to: `${ROOT}/broker` }, { label: b.name }]} />
      <section className={card}>
        <h1 className="text-center text-2xl font-semibold tracking-tight">{b.name}</h1>
        <p className="mt-1 text-center text-sm text-zinc-500">{b.description}</p>
      </section>

      {users.length > 0 && (
        <section className={`${card} mt-4`}>
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-2 font-semibold">
              <Users className="size-5" /> Stored Users ({users.length})
            </h2>
            <button onClick={() => setShowStored(!showStored)} className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800">
              <RefreshCw className="size-4" /> {showStored ? 'Hide' : 'Show'} Users
            </button>
          </div>
          {showStored && (
            <div className="mt-4 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {users.map((u) => (
                <div key={u.user_id} className="rounded-lg border border-zinc-200 p-3">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <h3 className="truncate font-medium">{u.full_name || u.user_id}</h3>
                    {u.account_status && <span className={`rounded-full px-2 py-0.5 text-xs ${u.account_status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>{u.account_status}</span>}
                  </div>
                  <p className="text-sm text-zinc-600">ID: {u.client_id}</p>
                  {u.email && <p className="text-sm text-zinc-500">{u.email}</p>}
                  {!!u.available_balance && <p className="mt-1 text-sm font-medium text-emerald-600">₹{u.available_balance.toLocaleString('en-IN')}</p>}
                  <button onClick={() => autofill.mutate(u)} className="mt-3 inline-flex h-8 w-full items-center justify-center gap-1 rounded-md bg-blue-50 text-xs font-medium text-blue-700 hover:bg-blue-100">
                    <RefreshCw className="size-3" /> Auto-fill
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      <section className={`${card} mt-4`}>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setError('');
            login.mutate();
          }}
          className={`mx-auto max-w-4xl space-y-4 rounded-xl border-2 p-4 sm:p-6 ${b.panel}`}
        >
          <div className="grid gap-4 md:grid-cols-2">
            <label className="block">
              {label('apiKey')}
              <input required value={form.apiKey} onChange={set('apiKey')} placeholder={b.fields.apiKey!.placeholder} autoComplete="off" className={input} />
            </label>
            {b.fields.clientId && (
              <label className="block">
                {label('clientId')}
                <input required value={form.clientId} onChange={set('clientId')} placeholder={b.fields.clientId.placeholder} autoComplete="off" className={input} />
              </label>
            )}
            {b.fields.password && <label className="block">{label('password')}{secretInput('password')}</label>}
            {b.fields.totp && (
              <div>
                <label className="block">
                  {label('totp')}
                  {secretInput(
                    'totp',
                    <button type="button" onClick={() => totp.mutate()} disabled={!secret.trim() || totp.isPending} title="Generate TOTP from the secret below" aria-label="Generate TOTP" className="absolute inset-y-0 right-10 flex items-center px-1 text-emerald-600 hover:text-emerald-800 disabled:opacity-40">
                      {totp.isPending ? <Loader className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
                    </button>,
                  )}
                </label>
                {remaining > 0 && (
                  <p className={`mt-1 flex items-center gap-2 text-sm ${remaining <= 5 ? 'font-medium text-red-600' : 'text-zinc-600'}`}>
                    <span className={`size-2 animate-pulse rounded-full ${remaining > 15 ? 'bg-emerald-500' : remaining > 5 ? 'bg-amber-500' : 'bg-red-500'}`} />
                    TOTP valid for {remaining}s{remaining <= 5 && ' - Generate new code!'}
                  </p>
                )}
              </div>
            )}
          </div>
          {b.id === 'angel' && (
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-zinc-700">TOTP Secret <span className="font-normal text-zinc-500">(optional, to generate the code)</span></span>
              <input type="password" value={secret} onChange={(e) => setSecret(e.target.value)} placeholder="Base32 secret from the authenticator QR" autoComplete="off" className={input} />
            </label>
          )}

          {error && (
            <p className="flex items-center gap-2 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              <AlertCircle className="size-5 shrink-0" /> {error}
            </p>
          )}
          <button type="submit" disabled={login.isPending} className={`flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r py-3 font-semibold text-white shadow-md hover:opacity-90 disabled:opacity-50 ${b.gradient}`}>
            {login.isPending ? <><Loader className="size-5 animate-spin" /> Authenticating...</> : <><Shield className="size-5" /> Login to {b.name}</>}
          </button>
        </form>
      </section>
    </>
  );
}
