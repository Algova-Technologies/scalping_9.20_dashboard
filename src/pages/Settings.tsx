import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, Pencil, Plus, Settings as Gear } from 'lucide-react';
import { useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router';
import { type Project, useProject } from '../projects';
import { blankSettings, fieldsFor, OPTIONAL_KEYS, type SettingKey, type Settings, validateSettings } from '../settingsForm';
import { btn, card, CardHeader, Crumbs, projectTrail, dbApi, Notice, MissingProject } from '../shared';
import { projectUrl } from '@/apps';

// fields: the settings this project's engine variant has (no_delta: base_price, with_delta: delta_max_age).
// Field pairs drawn side by side in one grid cell, half width each, at the first key's place.
const PAIRS: Partial<Record<SettingKey, SettingKey>> = {
  exch_seg: 'index_exch_seg',
  symbol_name: 'expiry',
  product_type: 'order_type',
  ce_delta_min: 'ce_delta_max',
  pe_delta_min: 'pe_delta_max',
  index_symbol: 'index_token',
};

type Resp = { is_empty: boolean; data: (Settings & { db_config_id: number }) | null; fields: SettingKey[] };

// /settings shows read-only values; /settings/edit is the same layout, editable.
// With no config row yet, /settings/edit creates it instead of updating.
export function Component() {
  const { id } = useParams();
  const { project: p } = useProject(id);
  const editing = useLocation().pathname.endsWith('/edit');
  const { data, isPending, error } = useQuery({
    queryKey: ['settings', p?.db],
    queryFn: () => dbApi<Resp>(p!.db, '/api/get_settings'),
    enabled: !!p,
  });

  if (!p) return <MissingProject />;
  if (isPending) return <Notice>Loading…</Notice>;
  if (error) return <Notice>{error.message}</Notice>;
  // key: fresh form state each time the screen switches between view and edit.
  return <SettingsForm key={String(editing)} p={p} resp={data} editing={editing} />;
}

const base = 'h-10 w-full rounded-md border px-3 text-sm placeholder:text-zinc-400 focus:outline-none focus:ring-2';

function SettingsForm({ p, resp, editing }: { p: Project; resp: Resp; editing: boolean }) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const url = `${projectUrl(p.id)}/settings`;
  const fields = fieldsFor(resp.fields);
  const [form, setForm] = useState<Settings>(() =>
    resp.data ? ({ ...blankSettings, ...Object.fromEntries(fields.map((f) => [f.key, String(resp.data![f.key] ?? '')])) } as Settings) : blankSettings,
  );
  const [submitted, setSubmitted] = useState(false);
  const errors = validateSettings(form, resp.fields);
  const valid = Object.keys(errors).length === 0;

  const save = useMutation({
    mutationFn: () =>
      dbApi(p.db, resp.is_empty ? '/api/create_settings' : '/api/update_settings', {
        method: resp.is_empty ? 'POST' : 'PUT',
        body: JSON.stringify(Object.fromEntries(fields.map((f) => [f.key, form[f.key].trim()]))),
      }),
    onSuccess: async () => {
      // Project name shows in the header, breadcrumbs and dashboard: refresh those too.
      await Promise.all([qc.invalidateQueries({ queryKey: ['settings', p.db] }), qc.invalidateQueries({ queryKey: ['projects'] })]);
      navigate(url);
    },
  });

  const trail = [
    ...projectTrail(p),
    ...(editing ? [{ label: 'Settings', to: url }, { label: resp.is_empty ? 'Create' : 'Edit' }] : [{ label: 'Settings' }]),
  ];
  const title = (
    <span className="inline-flex items-center gap-2">
      <Gear className="size-5" /> Settings
    </span>
  );

  if (!editing && resp.is_empty) {
    return (
      <>
        <Crumbs items={trail} />
        <section className={card}>
          <CardHeader back={`${projectUrl(p.id)}`} title={title} />
          <p className="mt-6 text-center text-sm text-zinc-500">No settings configured for this project yet.</p>
          <div className="mt-4 flex justify-center">
            <Link to="edit" className={btn.success}>
              <Plus className="size-4" /> Create Settings
            </Link>
          </div>
        </section>
      </>
    );
  }

  // One labelled input; PAIRS put two of these in one grid cell.
  const one = (f: (typeof fields)[number]) => {
    const err = editing && submitted ? errors[f.key] : undefined;
    const cls = !editing
      ? `${base} border-zinc-200 bg-zinc-50 text-zinc-600`
      : `${base} bg-white ${err ? 'border-red-400 focus:ring-red-100' : 'border-zinc-300 focus:ring-blue-100'}`;
    const aria = { 'aria-invalid': !!err, 'aria-describedby': err ? `${f.key}-err` : undefined };
    const set = (v: string) => setForm((s) => ({ ...s, [f.key]: v }));
    const optional = OPTIONAL_KEYS.includes(f.key); // nullable column: blank is allowed
    // Always offer the saved value, even if it's not in the known list.
    const opts = 'options' in f ? [...new Set([...(form[f.key] ? [form[f.key]] : []), ...f.options])] : null;
    return (
      <div key={f.key}>
        <label htmlFor={f.key} className="mb-1.5 block text-sm font-medium text-zinc-700">
          {!optional && <span className="text-red-500">* </span>}
          {f.label}
        </label>
        {editing && opts ? (
          <select id={f.key} value={form[f.key]} onChange={(e) => set(e.target.value)} className={cls} {...aria}>
            <option value="" disabled={!optional}>
              {f.placeholder}
            </option>
            {opts.map((o) => (
              <option key={o}>{o}</option>
            ))}
          </select>
        ) : (
          <input
            id={f.key}
            readOnly={!editing}
            value={form[f.key]}
            placeholder={f.placeholder}
            inputMode={'numeric' in f ? 'decimal' : undefined}
            autoComplete="off"
            onChange={(e) => {
              const v = e.target.value;
              set('numeric' in f ? v.replace('signed' in f ? /[^\d.-]/g : /[^\d.]/g, '') : 'upper' in f ? v.toUpperCase() : v);
            }}
            className={cls}
            {...aria}
          />
        )}
        {err && (
          <p id={`${f.key}-err`} className="mt-1 text-xs text-red-600">
            {err}
          </p>
        )}
      </div>
    );
  };

  return (
    <>
      <Crumbs items={trail} />
      <form
        noValidate
        className={card}
        onSubmit={(e) => {
          e.preventDefault();
          setSubmitted(true);
          if (valid) save.mutate();
        }}
      >
        <CardHeader back={editing ? url : `${projectUrl(p.id)}`} title={title} />
        {save.error && <p className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{save.error.message}</p>}

        <div className="mt-6 grid gap-x-5 gap-y-4 md:grid-cols-2 xl:grid-cols-4">
          {fields.map((f) => {
            if (Object.values(PAIRS).includes(f.key)) return null; // drawn beside its partner
            const mate = fields.find((g) => g.key === PAIRS[f.key]);
            return mate ? (
              <div key={f.key} className="grid grid-cols-2 gap-3">
                {[f, mate].map(one)}
              </div>
            ) : (
              one(f)
            );
          })}
        </div>

        <div className="mt-6 flex justify-end gap-3">
          {editing ? (
            <>
              <Link to={url} className={btn.secondary}>
                Cancel
              </Link>
              <button type="submit" disabled={save.isPending || (submitted && !valid)} className={btn.success}>
                <Check className="size-4" /> {save.isPending ? 'Saving…' : 'Save'}
              </button>
            </>
          ) : (
            <Link to="edit" className={btn.primary}>
              <Pencil className="size-4" /> Edit
            </Link>
          )}
        </div>
      </form>
    </>
  );
}
