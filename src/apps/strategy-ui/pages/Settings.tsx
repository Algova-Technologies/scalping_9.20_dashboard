import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Pencil, Plus, Save, Settings as SettingsIcon, Trash2, X } from 'lucide-react';
import { useState } from 'react';
import { btn, card, ConfirmDelete, Crumbs, Notice } from '@/shared';
import { json, trail, sapi, useApp, useScope } from '../api';

// db_configs columns in the old form's order. Every value is a string; index_* may be blank (NULL).
const FIELDS = [
  ['engine_version', 'Engine Version'], ['exch_seg', 'Exchange Segment'], ['symbol_name', 'Symbol Name'], ['expiry', 'Expiry'],
  ['lot_size', 'Lot Size'], ['interval', 'Interval'], ['product_type', 'Product Type'], ['order_type', 'Order Type'],
  ['atr_length', 'ATR Length'], ['min_factor', 'Min Factor'], ['max_factor', 'Max Factor'], ['step', 'Step'],
  ['from_cluster', 'From Cluster'], ['max_iter', 'Max Iter'], ['number_of_records', 'Number of Records'], ['perf_alpha', 'Perf Alpha'],
  ['base_price', 'Base Price'], ['base_brok_per_lot', 'Base Brokerage Per Lot'], ['threshold_trade_price', 'Threshold Trade Price'],
  ['start_trading_hour', 'Start Trading Hour'], ['start_trading_min', 'Start Trading Minute'],
  ['end_trading_hour', 'End Trading Hour'], ['end_trading_min', 'End Trading Minute'],
  ['sl', 'Stop Loss (SL)'], ['tp', 'Take Profit (TP)'], ['number_of_trade_allowed', 'Number of Trade Allowed'],
  ['trade_mode', 'Trade Mode'], ['index_symbol', 'Index Symbol'], ['index_token', 'Index Token'], ['index_exch_seg', 'Index Exchange Segment'],
] as const;
type Key = (typeof FIELDS)[number][0];
type Settings = Partial<Record<Key, string | null>>;
const OPTIONAL: Key[] = ['index_symbol', 'index_token', 'index_exch_seg'];
// A blank row with only this database's columns (older databases have just some of FIELDS).
const empty = (fields: Key[]) => Object.fromEntries(fields.map((k) => [k, k === 'trade_mode' ? 'PAPER' : ''])) as Settings;

// The engine's single config row: view, Edit → Save / Cancel, Delete, or Add Settings when there is none.
export function Component() {
  const app = useApp();
  const { db, qs } = useScope();
  const qc = useQueryClient();
  const key = ['su', 'settings', db];
  const q = useQuery({ queryKey: key, queryFn: () => sapi<{ data: Settings | null; fields: Key[] }>(db, 'settings') });
  const [draft, setDraft] = useState<Settings | null>(null); // non-null = editing
  const [confirm, setConfirm] = useState(false);
  const current = q.data?.data;
  const shownFields = FIELDS.filter(([k]) => q.data?.fields.includes(k));
  const done = async () => {
    await qc.invalidateQueries({ queryKey: key });
    setDraft(null);
    setConfirm(false);
  };
  const save = useMutation({ mutationFn: (s: Settings) => sapi(db, 'settings', json(current ? 'PUT' : 'POST', s)), onSuccess: done });
  const remove = useMutation({ mutationFn: () => sapi(db, 'settings', json('DELETE')), onSuccess: done });

  const shown = draft ?? current;
  const missing = draft ? shownFields.filter(([k]) => !OPTIONAL.includes(k) && !String(draft[k] ?? '').trim()) : [];
  const input = 'h-10 w-full rounded-md border border-zinc-300 px-3 text-sm focus:ring-2 focus:ring-blue-100 focus:outline-none disabled:cursor-not-allowed disabled:bg-zinc-50 disabled:text-zinc-500';

  return (
    <>
      <Crumbs items={[...trail(app, qs()), { label: 'Settings' }]} />
      <section className={card}>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="flex items-center gap-2 text-lg font-semibold">
            <SettingsIcon className="size-5" /> Settings
          </h1>
          {q.data && !current && !draft && (
            <button onClick={() => setDraft(empty(q.data.fields))} className={`${btn.primary} ml-auto`}>
              <Plus className="size-4" /> Add Settings
            </button>
          )}
        </div>

        {q.isPending && <p className="py-8 text-center text-sm text-zinc-400">Loading settings…</p>}
        {q.error && <div className="mt-4"><Notice>{q.error.message}</Notice></div>}
        {q.data && !shown && <p className="py-8 text-center text-sm text-zinc-500">No settings yet. Click "Add Settings" to create them.</p>}
        {(save.error || remove.error) && <p className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{(save.error ?? remove.error)!.message}</p>}

        {shown && (
          <>
            <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
              {shownFields.map(([k, label]) => (
                <label key={k} className="block">
                  <span className="mb-1 block text-sm font-medium text-zinc-700">
                    {!OPTIONAL.includes(k) && <span className="text-red-500">* </span>}
                    {label}
                  </span>
                  {k === 'trade_mode' ? (
                    <select disabled={!draft} value={shown[k] ?? 'PAPER'} onChange={(e) => setDraft({ ...draft!, [k]: e.target.value })} className={`${input} bg-white`}>
                      <option>PAPER</option>
                      <option>LIVE</option>
                    </select>
                  ) : (
                    <input disabled={!draft} maxLength={100} value={shown[k] ?? ''} onChange={(e) => setDraft({ ...draft!, [k]: e.target.value })} className={`${input} bg-white`} />
                  )}
                </label>
              ))}
            </div>
            <div className="mt-6 flex flex-wrap justify-end gap-3">
              {draft ? (
                <>
                  {missing.length > 0 && <p className="mr-auto self-center text-sm text-zinc-500">Fill in every required field to save ({missing.length} left).</p>}
                  <button onClick={() => setDraft(null)} disabled={save.isPending} className={btn.secondary}>
                    <X className="size-4" /> Cancel
                  </button>
                  <button onClick={() => save.mutate(draft)} disabled={save.isPending || missing.length > 0} className={btn.primary}>
                    <Save className="size-4" /> {save.isPending ? 'Saving…' : current ? 'Save' : 'Create'}
                  </button>
                </>
              ) : (
                <>
                  <button onClick={() => setConfirm(true)} className={btn.danger}>
                    <Trash2 className="size-4" /> Delete
                  </button>
                  <button onClick={() => setDraft(current!)} className={btn.primary}>
                    <Pencil className="size-4" /> Edit
                  </button>
                </>
              )}
            </div>
          </>
        )}
      </section>
      <ConfirmDelete noun="settings" name={confirm ? `The ${db} engine settings` : null} pending={remove.isPending} error={remove.error} onConfirm={() => remove.mutate()} onCancel={() => setConfirm(false)} />
    </>
  );
}
