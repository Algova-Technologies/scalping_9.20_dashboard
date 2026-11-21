import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Check, Eye, EyeOff } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { Link, useNavigate } from 'react-router';
import { blank, brokers, btn, card, CardHeader, Crumbs, dbApi, fields, type Form, isAdmin, Notice, roles, type User, usersTrail, useUsers, validate, MissingProject } from '../../users';
import { projectUrl } from '@/apps';

// One screen for both create (/users/new, blank) and edit (/users/:userId/edit, pre-filled).
export function Component() {
  const { project: p, userId, user, data, isPending, error } = useUsers();
  if (!p) return <MissingProject />;
  if (isPending) return <Notice>Loading…</Notice>;
  if (error) return <Notice>{error.message}</Notice>;
  if (userId && !user) return <Notice>User not found.</Notice>;
  // key: a fresh form state per user, so switching users never leaks old values.
  return <UserForm key={userId ?? 'new'} p={p} user={user} users={data} />;
}

const input =
  'h-10 w-full rounded-md border bg-white px-3 text-sm placeholder:text-zinc-400 focus:outline-none focus:ring-2';

function UserForm({ p, user, users }: { p: { id: string; name: string; db: string; database: string }; user?: User; users: User[] }) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [form, setForm] = useState<Form>(() => {
    if (!user) return blank;
    const f = Object.fromEntries(fields.map((k) => [k, String(user[k] ?? '')])) as Form;
    // Old rows store "0" for "not set" and mixed-case role/broker; normalise to what the selects use.
    return { ...f, role: f.role.toLowerCase(), broker: f.broker.toLowerCase(), buying_power: f.buying_power === '0' ? '' : f.buying_power };
  });
  const [submitted, setSubmitted] = useState(false);
  const [showPw, setShowPw] = useState(false);

  const adminTaken = users.some((u) => isAdmin(u) && u.user_id !== user?.user_id);
  const errors = validate(form, adminTaken);
  const valid = Object.keys(errors).length === 0;
  const listUrl = `${projectUrl(p.id)}/users`;

  const save = useMutation({
    mutationFn: () => {
      // Trim text; empty buying power goes as null (backend treats it as "not set").
      const body = Object.fromEntries(fields.map((f) => [f, form[f].trim()])) as Record<string, string | number | null>;
      body.buying_power = form.buying_power || null;
      return user
        ? dbApi(p.db, '/api/update_user', { method: 'PUT', body: JSON.stringify({ ...body, user_id: user.user_id }) })
        : dbApi(p.db, '/api/create_user', { method: 'POST', body: JSON.stringify(body) });
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['users', p.db] });
      navigate(user ? `${listUrl}/${user.user_id}` : listUrl);
    },
  });

  const set = (k: keyof Form) => (v: string) => setForm((f) => ({ ...f, [k]: v }));
  const digits = (max: number) => (v: string) => v.replace(/\D/g, '').slice(0, max);

  // Errors show after the first submit attempt, then update live as the user fixes them.
  const field = (k: keyof Form, label: string, control: (cls: string, describedBy?: string) => ReactNode, opts?: { optional?: boolean; hint?: string }) => {
    const err = submitted ? errors[k] : undefined;
    const cls = `${input} ${err ? 'border-red-400 focus:ring-red-100' : 'border-zinc-300 focus:ring-blue-100'}`;
    return (
      <div>
        <label htmlFor={k} className="mb-1.5 block text-sm font-medium text-zinc-700">
          {!opts?.optional && <span className="text-red-500">* </span>}
          {label}
          {opts?.hint && <span className="ml-1 text-xs font-normal text-zinc-500">({opts.hint})</span>}
        </label>
        {control(cls, err ? `${k}-err` : undefined)}
        {err && (
          <p id={`${k}-err`} className="mt-1 text-xs text-red-600">
            {err}
          </p>
        )}
      </div>
    );
  };
  const text = (k: keyof Form, placeholder: string, extra?: { type?: string; inputMode?: 'numeric' | 'email'; map?: (v: string) => string; autoComplete?: string }) =>
    (cls: string, describedBy?: string) => (
      <input
        id={k}
        type={extra?.type ?? 'text'}
        inputMode={extra?.inputMode}
        autoComplete={extra?.autoComplete ?? 'off'}
        value={form[k]}
        placeholder={placeholder}
        aria-invalid={!!describedBy}
        aria-describedby={describedBy}
        onChange={(e) => set(k)(extra?.map ? extra.map(e.target.value) : e.target.value)}
        className={cls}
      />
    );
  const select = (k: keyof Form, options: { value: string; label: string; disabled?: boolean }[]) => (cls: string, describedBy?: string) => (
    <select id={k} value={form[k]} aria-invalid={!!describedBy} aria-describedby={describedBy} onChange={(e) => set(k)(e.target.value)} className={cls}>
      {options.map((o) => (
        <option key={o.value} value={o.value} disabled={o.disabled}>
          {o.label}
          {o.disabled ? ' (already exists)' : ''}
        </option>
      ))}
    </select>
  );

  const title = user ? 'Edit User' : 'Create New User';
  return (
    <>
      <Crumbs
        items={[
          ...usersTrail(p),
          ...(user ? [{ label: user.full_name, to: `${listUrl}/${user.user_id}` }, { label: 'Edit' }] : [{ label: 'New User' }]),
        ]}
      />
      <form
        noValidate
        className={card}
        onSubmit={(e) => {
          e.preventDefault();
          setSubmitted(true);
          if (valid) save.mutate();
        }}
      >
        <CardHeader back={user ? `${listUrl}/${user.user_id}` : listUrl} title={title} />
        {save.error && <p className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{save.error.message}</p>}

        <div className="mt-5 grid gap-x-5 gap-y-4 md:grid-cols-2 xl:grid-cols-4">
          {field('first_name', 'First Name', text('first_name', 'Enter first name', { autoComplete: 'given-name' }))}
          {field('last_name', 'Last Name', text('last_name', 'Enter last name', { autoComplete: 'family-name' }))}
          {field('email', 'Email', text('email', 'example@email.com', { type: 'email', inputMode: 'email', autoComplete: 'email' }))}
          {field('mobile', 'Mobile', text('mobile', 'Enter 10-digit mobile number', { inputMode: 'numeric', map: digits(10), autoComplete: 'tel-national' }))}
          {field('role', 'Role', select('role', roles.map((r) => ({ ...r, disabled: r.value === 'admin' && adminTaken }))))}
          {field('broker', 'Broker', select('broker', brokers))}
          {field('client_id', 'Client ID', text('client_id', 'Enter broker client ID'))}
          {field('password', 'Password', (cls, describedBy) => (
            <div className="relative">
              {text('password', 'Enter broker password', { type: showPw ? 'text' : 'password', autoComplete: 'new-password' })(`${cls} pr-10`, describedBy)}
              <button
                type="button"
                onClick={() => setShowPw((s) => !s)}
                aria-label={showPw ? 'Hide password' : 'Show password'}
                className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-zinc-400 hover:text-zinc-700"
              >
                {showPw ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
          ))}
          {field('api_key', 'API Key', text('api_key', 'Enter broker API key'))}
          {field('qr_totp_token', 'TOTP Token', text('qr_totp_token', 'Enter base32 TOTP secret', { map: (v) => v.toUpperCase() }))}
          {field('buying_power', 'Buying Power', text('buying_power', 'e.g. 15000', { inputMode: 'numeric', map: digits(12) }), {
            optional: true,
            hint: 'Minimum 15,000',
          })}
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <Link to={user ? `${listUrl}/${user.user_id}` : listUrl} className={btn.secondary}>
            Cancel
          </Link>
          <button type="submit" disabled={save.isPending || (submitted && !valid)} className={btn.success}>
            <Check className="size-4" /> {save.isPending ? 'Saving…' : 'Save'}
          </button>
        </div>
      </form>
    </>
  );
}
