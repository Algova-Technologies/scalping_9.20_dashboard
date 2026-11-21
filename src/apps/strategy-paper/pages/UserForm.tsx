import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Check, Eye, EyeOff, UserRound } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { btn, card, Crumbs, Notice, Toggle } from '@/shared';
import { isMaster, json, papi, trail, useApp, type User, useScope } from '../api';
import { blankForm, SECRETS, toPayload, validateUser, type UserForm } from '../userForm';

// /users/new (blank) and /users/:userId/edit (pre-filled; broker secrets are never sent back, blank keeps them).
export function Component() {
  const app = useApp();
  const { root: ROOT } = app;
  const { userId } = useParams();
  const { users, usersQuery, qs } = useScope();
  const user = users.find((u) => String(u.user_id) === userId);
  const crumbs = (
    <Crumbs items={[...trail(app, qs()), { label: 'Users', to: `${ROOT}/users` }, ...(userId ? [{ label: user?.full_name ?? 'User', to: `${ROOT}/users/${userId}` }, { label: 'Edit' }] : [{ label: 'Add User' }])]} />
  );
  if (usersQuery.isPending) return <>{crumbs}<Notice>Loading…</Notice></>;
  if (usersQuery.error) return <>{crumbs}<Notice>{usersQuery.error.message}</Notice></>;
  if (userId && !user) return <>{crumbs}<Notice>User not found.</Notice></>;
  return <>{crumbs}<Form key={userId ?? 'new'} user={user} users={users} /></>;
}

const input = 'h-10 w-full rounded-md border bg-white px-3 text-sm placeholder:text-zinc-400 focus:ring-2 focus:outline-none';
const LABELS: Record<string, string> = { password: 'Password', api_key: 'API Key', qr_totp_token: 'TOTP Token' };

function Form({ user, users }: { user?: User; users: User[] }) {
  const app = useApp();
  const { root: ROOT } = app;
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [f, setF] = useState<UserForm>(() =>
    user ? { ...blankForm, ...user, client_id: user.client_id ?? '', buying_power: user.buying_power === '0' ? '' : user.buying_power ?? '', password: '', api_key: '', qr_totp_token: '' } : blankForm,
  );
  const [submitted, setSubmitted] = useState(false);
  const [show, setShow] = useState<Record<string, boolean>>({});
  const masterTaken = users.some((u) => isMaster(u) && u.user_id !== user?.user_id);
  const errors = validateUser(f, { creating: !user, masterTaken, mode: app.mode });
  const valid = Object.keys(errors).length === 0;
  const save = useMutation({
    mutationFn: () => (user ? papi(app, `users/${user.user_id}`, json('PUT', toPayload(f))) : papi(app, 'users', json('POST', toPayload(f)))),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: [app.api, 'users'] });
      navigate(`${ROOT}/users`, { replace: true });
    },
  });
  const set = <K extends keyof UserForm>(k: K, v: UserForm[K]) => setF((x) => ({ ...x, [k]: v }));
  const field = (k: keyof UserForm, label: string, control: (cls: string) => ReactNode, required = true) => {
    const err = submitted ? errors[k] : undefined;
    return (
      <div key={k}>
        <label htmlFor={`sp-${k}`} className="mb-1.5 block text-sm font-medium text-zinc-700">{label}{required && <span className="ml-1 text-red-500">*</span>}</label>
        {control(`${input} ${err ? 'border-red-400 focus:ring-red-100' : 'border-zinc-300 focus:ring-blue-100'}`)}
        {err && <p className="mt-1 text-xs text-red-600">{err}</p>}
      </div>
    );
  };
  const text = (k: keyof UserForm, placeholder: string, map?: (v: string) => string, type = 'text') => (cls: string) => (
    <input id={`sp-${k}`} type={type} autoComplete="off" value={String(f[k])} placeholder={placeholder} onChange={(e) => set(k, (map ? map(e.target.value) : e.target.value) as never)} className={cls} />
  );
  const toggle = (k: 'account_status' | 'broker_connection_status' | 'trade_status', label: string) => (
    <div className="flex items-center justify-between gap-4 rounded-md border border-zinc-200 px-3 py-2.5">
      <span className="text-sm font-medium text-zinc-700">{label}</span>
      <Toggle on={f[k] === 1} label={label} onChange={() => set(k, f[k] ? 0 : 1)} />
    </div>
  );

  return (
    <form noValidate className={card} onSubmit={(e) => { e.preventDefault(); setSubmitted(true); if (valid) save.mutate(); }}>
      <h1 className="flex items-center gap-2 text-lg font-semibold"><UserRound className="size-5" /> {user ? 'Edit User' : 'Add User'}</h1>
      {save.error && <p className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{save.error.message}</p>}

      <h2 className="mt-6 mb-4 font-semibold">User Details</h2>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {field('first_name', 'First Name', text('first_name', 'Enter first name'))}
        {field('last_name', 'Last Name', text('last_name', 'Enter last name'))}
        {field('email', 'Email', text('email', 'name@example.com', undefined, 'email'))}
        {field('mobile', 'Mobile', text('mobile', 'Enter 10-digit mobile number', (v) => v.replace(/\D/g, '').slice(0, 10)))}
        {field('trade_role', `${app.word} Trade Role`, (cls) => (
          <select id="sp-trade_role" value={f.trade_role} onChange={(e) => set('trade_role', e.target.value as UserForm['trade_role'])} className={cls}>
            <option value="user">User</option>
            <option value="master" disabled={masterTaken}>Master{masterTaken ? ' (already exists)' : ''}</option>
          </select>
        ))}
        {field('buying_power', 'Buying Power', text('buying_power', 'Optional, minimum 15,000', (v) => v.replace(/\D/g, '').slice(0, 12)), false)}
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {toggle('account_status', 'Account Status')}
        {f.trade_role !== 'master' && toggle('trade_status', `${app.word} Trade Status`)}
        {toggle('broker_connection_status', 'Broker Connection Status')}
      </div>

      <h2 className="mt-6 mb-4 font-semibold">Broker Details</h2>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {field('broker', 'Broker', (cls) => (
          <select id="sp-broker" value={f.broker} onChange={(e) => set('broker', e.target.value)} className={cls}>
            <option value="angel">Angel Broking</option>
          </select>
        ))}
        {field('client_id', 'Client ID', text('client_id', 'Enter broker client ID'))}
        {SECRETS.map((k) => field(k, LABELS[k], (cls) => (
          <div className="relative">
            {text(k, user ? 'Leave blank to keep saved value' : `Enter ${LABELS[k].toLowerCase()}`, undefined, show[k] ? 'text' : 'password')(`${cls} pr-10`)}
            <button type="button" onClick={() => setShow({ ...show, [k]: !show[k] })} aria-label={`${show[k] ? 'Hide' : 'Show'} ${LABELS[k]}`} className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-zinc-400 hover:text-zinc-700">
              {show[k] ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </div>
        ), !user))}
      </div>

      <div className="mt-6 flex justify-end gap-3 border-t border-zinc-100 pt-4">
        <Link to={`${ROOT}/users`} className={btn.secondary}>Cancel</Link>
        <button type="submit" disabled={save.isPending || (submitted && !valid)} className={btn.success}>
          <Check className="size-4" /> {save.isPending ? 'Saving…' : user ? 'Save Changes' : 'Create User'}
        </button>
      </div>
    </form>
  );
}
