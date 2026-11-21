import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Pencil, Plus, Save, Settings as SettingsIcon, Trash2, X } from 'lucide-react';
import { useState } from 'react';
import { btn, card, ConfirmDelete, Crumbs, Notice } from '@/shared';
import { json, papi, trail, useApp, useScope } from '../api';

// db_configs columns in the old form's order. Every value is a string; index_* may be blank (stored as NULL).
const FIELDS = [
  ['exch_seg', 'Exchange Segment', ''], ['symbol_name', 'Symbol Name', ''], ['expiry', 'Expiry', ''], ['lot_size', 'Lot Size', ''],
  ['product_type', 'Product Type', ''], ['order_type', 'Order Type', ''], ['sl', 'Stop Loss (SL)', ''], ['tp', 'Take Profit (TP)', ''],
  ['number_of_trade_allowed', 'Number of Trade Allowed', ''], ['index_symbol', 'Index Symbol', 'e.g. Nifty 50'],
  ['index_token', 'Index Token', 'e.g. 99926000'], ['index_exch_seg', 'Index Exchange Segment', 'e.g. NSE'], ['delta_max_age', 'Delta Max Age (seconds)', ''],
] as const;
type Key = (typeof FIELDS)[number][0];
type Settings = Record<Key, string | null>;
const OPTIONAL: Key[] = ['index_symbol', 'index_token', 'index_exch_seg'];
const empty = { ...Object.fromEntries(FIELDS.map(([k]) => [k, ''])), delta_max_age: '30' } as Settings;

// The engine's single config row: view, Edit → Save / Cancel, Delete, or Add Settings when there is none.
export function Component() {
  const app = useApp();
  const { db: DB } = app;
  const { qs } = useScope();
  const qc = useQueryClient();
  const key = [app.api, 'settings'];
  const q = useQuery({ queryKey: key, queryFn: () => papi<{ data: Settings | null }>(app, 'settings') });
  const [draft, setDraft] = useState<Settings | null>(null); // non-null = editing
  const [confirm, setConfirm] = useState(false);
  const current = q.data?.data;
  const done = async () => {
    await qc.invalidateQueries({ queryKey: key });
    setDraft(null);
    setConfirm(false);
  };
  const save = useMutation({ mutationFn: (s: Settings) => papi(app, 'settings', json(current ? 'PUT' : 'POST', s)), onSuccess: done });
  const remove = useMutation({ mutationFn: () => papi(app, 'settings', json('DELETE')), onSuccess: done });
  const shown = draft ?? current;
  const missing = draft ? FIELDS.filter(([k]) => !OPTIONAL.includes(k) && !String(draft[k] ?? '').trim()) : [];
  const input = 'h-10 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm placeholder:text-zinc-400 focus:ring-2 focus:ring-blue-100 focus:outline-none disabled:cursor-not-allowed disabled:bg-zinc-50 disabled:text-zinc-500';

  return (
    <>
      <Crumbs items={[...trail(app, qs()), { label: 'Settings' }]} />
      <section className={card}>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="flex items-center gap-2 text-lg font-semibold"><SettingsIcon className="size-5" /> Settings</h1>
          <span className="text-sm text-zinc-400">{DB}</span>
          {q.data && !current && !draft && (
            <button onClick={() => setDraft(empty)} className={`${btn.primary} ml-auto`}><Plus className="size-4" /> Add Settings</button>
          )}
        </div>
        {q.isPending && <p className="py-8 text-center text-sm text-zinc-400">Loading settings…</p>}
        {q.error && <div className="mt-4"><Notice>{q.error.message}</Notice></div>}
        {q.data && !shown && <p className="py-8 text-center text-sm text-zinc-500">No settings yet. Click "Add Settings" to create them.</p>}
        {(save.error || remove.error) && <p className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{(save.error ?? remove.error)!.message}</p>}
        {shown && (
          <>
            <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
              {FIELDS.map(([k, label, placeholder]) => (
                <label key={k} className="block">
                  <span className="mb-1 block text-sm font-medium text-zinc-700">{!OPTIONAL.includes(k) && <span className="text-red-500">* </span>}{label}</span>
                  <input disabled={!draft} maxLength={100} value={shown[k] ?? ''} placeholder={draft ? placeholder : ''} onChange={(e) => setDraft({ ...draft!, [k]: e.target.value })} className={input} />
                </label>
              ))}
            </div>
            <div className="mt-6 flex flex-wrap justify-end gap-3">
              {draft ? (
                <>
                  {missing.length > 0 && <p className="mr-auto self-center text-sm text-zinc-500">Fill in every required field to save ({missing.length} left).</p>}
                  <button onClick={() => setDraft(null)} disabled={save.isPending} className={btn.secondary}><X className="size-4" /> Cancel</button>
                  <button onClick={() => save.mutate(draft)} disabled={save.isPending || missing.length > 0} className={btn.primary}>
                    <Save className="size-4" /> {save.isPending ? 'Saving…' : current ? 'Save' : 'Create'}
                  </button>
                </>
              ) : (
                <>
                  <button onClick={() => setConfirm(true)} className={btn.danger}><Trash2 className="size-4" /> Delete</button>
                  <button onClick={() => setDraft(current!)} className={btn.primary}><Pencil className="size-4" /> Edit</button>
                </>
              )}
            </div>
          </>
        )}
      </section>
      <ConfirmDelete noun="settings" name={confirm ? `The ${DB} engine settings` : null} pending={remove.isPending} error={remove.error} onConfirm={() => remove.mutate()} onCancel={() => setConfirm(false)} />
    </>
  );
}
