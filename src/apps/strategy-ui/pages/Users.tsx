import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Check, Eye, EyeOff, Pencil, Plus, Trash2, User as UserIcon } from 'lucide-react';
import { type ReactNode, useEffect, useRef, useState } from 'react';
import { actionBtn, btn, card, ConfirmDelete, Crumbs, Notice, Toggle } from '@/shared';
import { blank, brokers, fields, type Form, roles, validate } from '@/userForm';
import { json, trail, roleLabel, sapi, useApp, type User, type UserField, useScope, useUserFields } from '../api';

type Status = 'is_active' | 'account_status' | 'trade_status';
const STATUS: { key: Status; head: string; on: string; off: string }[] = [
  { key: 'is_active', head: 'Status', on: 'Active', off: 'Inactive' },
  { key: 'account_status', head: 'Account Status', on: 'OK', off: 'Not OK' },
  { key: 'trade_status', head: 'Trade Status', on: 'Trading', off: 'Not Trading' },
];
const brokerName = (b: string | null) => !b ? '' : brokers.find((x) => x.value === b.toLowerCase())?.label ?? roleLabel(b);

// Users Management: the database's users, with their three switches, create / edit (dialog) and delete.
export function Component() {
  const app = useApp();
  const { db, users, usersQuery, qs } = useScope();
  const has = useUserFields(db).data ?? []; // optional columns this database's users table has
  const status = STATUS.filter((s) => s.key !== 'trade_status' || has.includes('trade_status'));
  const qc = useQueryClient();
  const [editing, setEditing] = useState<User | 'new' | null>(null);
  const [deleting, setDeleting] = useState<User | null>(null);
  const refresh = () => qc.invalidateQueries({ queryKey: ['su', 'users', db] });

  const toggle = useMutation({
    mutationFn: ({ u, key }: { u: User; key: Status }) => sapi(db, `users/${u.user_id}/status`, json('PATCH', { status_type: key, value: u[key] ? 0 : 1 })),
    // Stop a refresh in flight first, so the 1s poll can't flip the switch back before the save lands.
    onMutate: async ({ u, key }) => {
      await qc.cancelQueries({ queryKey: ['su', 'users', db] });
      qc.setQueryData<User[]>(['su', 'users', db], (old) => old?.map((x) => (x.user_id === u.user_id ? { ...x, [key]: u[key] ? 0 : 1 } : x)));
    },
    onSettled: refresh,
  });
  const remove = useMutation({
    mutationFn: (u: User) => sapi(db, `users/${u.user_id}`, json('DELETE')),
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
          <h1 className="flex items-center gap-2 text-lg font-semibold">
            <UserIcon className="size-5" /> Users Management
          </h1>
          <button onClick={() => setEditing('new')} className={`${btn.primary} ml-auto`}>
            <Plus className="size-4" /> Add User
          </button>
        </div>
        {toggle.error && <p className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{toggle.error.message}</p>}
        {usersQuery.isPending ? (
          <p className="py-8 text-center text-sm text-zinc-400">Loading users…</p>
        ) : usersQuery.error ? (
          <Notice>{usersQuery.error.message}</Notice>
        ) : users.length === 0 ? (
          <p className="py-8 text-center text-sm text-zinc-500">No users found. Click "Add User" to create one.</p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full border border-zinc-200 text-sm">
              <thead className="bg-zinc-50 text-xs font-medium tracking-wide text-zinc-600 uppercase">
                <tr className="divide-x divide-zinc-200">
                  {['Sr', 'Name', 'Mobile', ...(has.includes('broker') ? ['Broker'] : [])].map((h) => <th key={h} className="px-4 py-3 text-left">{h}</th>)}
                  {[...status.map((s) => s.head), 'Actions'].map((h) => <th key={h} className="px-4 py-3">{h}</th>)}
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200">
                {users.map((u, i) => (
                  <tr key={u.user_id} className="divide-x divide-zinc-200 hover:bg-zinc-50">
                    <td className="px-4 py-3">{i + 1}</td>
                    <td className="px-4 py-3 font-medium">{u.full_name} ({roleLabel(u.role)})</td>
                    <td className="px-4 py-3 tabular-nums">{u.mobile}</td>
                    {has.includes('broker') && <td className="px-4 py-3">{brokerName(u.broker)}</td>}
                    {status.map((s) => (
                      <td key={s.key} className="px-4 py-3 text-center" title={u[s.key] ? s.on : s.off}>
                        <Toggle on={u[s.key] === 1} label={`${s.head} of ${u.full_name}`} disabled={toggle.isPending} onChange={() => toggle.mutate({ u, key: s.key })} />
                      </td>
                    ))}
                    <td className="px-4 py-3">
                      <span className="flex items-center justify-center gap-2">
                        <button onClick={() => setEditing(u)} title="Edit User" aria-label={`Edit ${u.full_name}`} className={actionBtn.edit}>
                          <Pencil className="size-4" />
                        </button>
                        <button onClick={() => setDeleting(u)} title="Delete User" aria-label={`Delete ${u.full_name}`} className={actionBtn.delete}>
                          <Trash2 className="size-4" />
                        </button>
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {editing && <UserDialog key={editing === 'new' ? 'new' : editing.user_id} db={db} has={has} user={editing === 'new' ? undefined : editing} users={users} onClose={() => setEditing(null)} />}
      <ConfirmDelete
        noun="user"
        name={deleting?.full_name ?? null}
        pending={remove.isPending}
        error={remove.error}
        onConfirm={() => deleting && remove.mutate(deleting)}
        onCancel={() => {
          setDeleting(null);
          remove.reset();
        }}
      />
    </>
  );
}

const input = 'h-10 w-full rounded-md border bg-white px-3 text-sm placeholder:text-zinc-400 focus:ring-2 focus:outline-none';
const digits = (max: number) => (v: string) => v.replace(/\D/g, '').slice(0, max);

function UserDialog({ db, has, user, users, onClose }: { db: string; has: UserField[]; user?: User; users: User[]; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => ref.current?.showModal(), []);
  const qc = useQueryClient();
  const [form, setForm] = useState<Form>(() => {
    if (!user) return blank;
    const f = Object.fromEntries(fields.map((k) => [k, String(user[k] ?? '')])) as Form;
    // No broker column: keep the form's default so the shared validation passes; it is never sent.
    return { ...f, role: f.role.toLowerCase(), broker: f.broker.toLowerCase() || blank.broker, buying_power: f.buying_power === '0' ? '' : f.buying_power };
  });
  const [submitted, setSubmitted] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const adminTaken = users.some((u) => u.role.toLowerCase() === 'admin' && u.user_id !== user?.user_id);
  const errors = validate(form, adminTaken);
  const valid = Object.keys(errors).length === 0;

  const save = useMutation({
    mutationFn: () => {
      // Only the columns this database has: the backend rejects the rest.
      const sent = fields.filter((f) => (f !== 'broker' && f !== 'buying_power') || has.includes(f));
      const body = { ...Object.fromEntries(sent.map((f) => [f, form[f].trim()])), ...(has.includes('buying_power') && { buying_power: form.buying_power || null }) };
      return user ? sapi(db, `users/${user.user_id}`, json('PUT', body)) : sapi(db, 'users', json('POST', body));
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['su', 'users', db] });
      onClose();
    },
  });

  const field = (k: keyof Form, label: string, el: (cls: string) => ReactNode, optional = false) => {
    const err = submitted ? errors[k] : undefined;
    return (
      <div>
        <label htmlFor={`su-${k}`} className="mb-1.5 block text-sm font-medium text-zinc-700">
          {!optional && <span className="text-red-500">* </span>}
          {label}
        </label>
        {el(`${input} ${err ? 'border-red-400 focus:ring-red-100' : 'border-zinc-300 focus:ring-blue-100'}`)}
        {err && <p className="mt-1 text-xs text-red-600">{err}</p>}
      </div>
    );
  };
  const text = (k: keyof Form, placeholder = '', map?: (v: string) => string, type = 'text') => (cls: string) => (
    <input id={`su-${k}`} type={type} autoComplete="off" value={form[k]} placeholder={placeholder} onChange={(e) => setForm({ ...form, [k]: map ? map(e.target.value) : e.target.value })} className={cls} />
  );
  const select = (k: keyof Form, options: { value: string; label: string; disabled?: boolean }[]) => (cls: string) => (
    <select id={`su-${k}`} value={form[k]} onChange={(e) => setForm({ ...form, [k]: e.target.value })} className={cls}>
      {options.map((o) => (
        <option key={o.value} value={o.value} disabled={o.disabled}>
          {o.label}
          {o.disabled ? ' (already exists)' : ''}
        </option>
      ))}
    </select>
  );

  return (
    <dialog ref={ref} onClose={onClose} aria-labelledby="su-user-title" className="m-auto max-h-[90vh] w-[min(42rem,calc(100%-2rem))] rounded-xl p-6 shadow-xl backdrop:bg-black/40">
      <form
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          setSubmitted(true);
          if (valid) save.mutate();
        }}
      >
        <h2 id="su-user-title" className="text-lg font-semibold">{user ? 'Edit User' : 'Create New User'}</h2>
        {save.error && <p className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{save.error.message}</p>}
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          {field('first_name', 'First Name', text('first_name'))}
          {field('last_name', 'Last Name', text('last_name'))}
          {field('email', 'Email', text('email', 'example@email.com', undefined, 'email'))}
          {field('mobile', 'Mobile', text('mobile', 'Enter 10-digit mobile number', digits(10)))}
          {field('role', 'Role', select('role', roles.map((r) => ({ ...r, disabled: r.value === 'admin' && adminTaken }))))}
          {has.includes('broker') && field('broker', 'Broker', select('broker', brokers))}
          {field('client_id', 'Client ID', text('client_id'))}
          {field('password', 'Password', (cls) => (
            <div className="relative">
              {text('password', '', undefined, showPw ? 'text' : 'password')(`${cls} pr-10`)}
              <button type="button" onClick={() => setShowPw(!showPw)} aria-label={showPw ? 'Hide password' : 'Show password'} className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-zinc-400 hover:text-zinc-700">
                {showPw ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
          ))}
          {field('api_key', 'API Key', text('api_key'))}
          {field('qr_totp_token', 'TOTP Token', text('qr_totp_token', 'Base32 TOTP secret', (v) => v.toUpperCase()))}
          {has.includes('buying_power') && field('buying_power', 'Buying Power (minimum 15,000)', text('buying_power', 'Optional', digits(12)), true)}
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <button type="button" onClick={onClose} className={btn.secondary}>
            Cancel
          </button>
          <button type="submit" disabled={save.isPending || (submitted && !valid)} className={btn.success}>
            <Check className="size-4" /> {save.isPending ? 'Saving…' : user ? 'Update User' : 'Create User'}
          </button>
        </div>
      </form>
    </dialog>
  );
}
