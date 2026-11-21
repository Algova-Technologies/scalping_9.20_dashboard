import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Pencil, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { card, CardHeader, ConfirmDelete, Crumbs, dbApi, Notice, MissingProject, actionBtn } from '../../shared';
import { NOTE, variantsTrail, variantsUrl, useVariants } from '../../variants';

export function Component() {
  const { project: p, variant: v, isPending, error } = useVariants();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [confirming, setConfirming] = useState(false);
  const remove = useMutation({
    mutationFn: () => dbApi(p!.db, `/api/varients/${v!.varient_id}`, { method: 'DELETE' }),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['variants', p!.db] });
      navigate(variantsUrl(p!));
    },
  });

  if (!p) return <MissingProject />;
  if (isPending) return <Notice>Loading…</Notice>;
  if (error) return <Notice>{error.message}</Notice>;
  if (!v) return <Notice>Variant not found.</Notice>;

  const rows = [
    { label: 'ID', value: v.varient_id, cls: 'text-zinc-900' },
    { label: 'Name', value: v.name, cls: 'text-zinc-900' },
    { label: 'Stop Loss (SL) · points', value: v.sl, cls: 'text-red-600' },
    { label: 'Take Profit (TP) · points', value: v.tp, cls: 'text-emerald-600' },
    { label: 'Status', value: v.is_active ? 'Enabled' : 'Disabled', cls: v.is_active ? 'text-emerald-600' : 'text-zinc-400' },
  ];

  return (
    <>
      <Crumbs items={[...variantsTrail(p), { label: v.name }]} />
      <section className={card}>
        <CardHeader back={variantsUrl(p)} title={v.name}>
          <Link to="edit" title="Edit" aria-label={`Edit ${v.name}`} className={actionBtn.edit}>
            <Pencil className="size-4" />
          </Link>
          {!v.is_default && (
            <button onClick={() => setConfirming(true)} title="Delete" aria-label={`Delete ${v.name}`} className={actionBtn.delete}>
              <Trash2 className="size-4" />
            </button>
          )}
        </CardHeader>
        <p className="mt-4 text-sm text-zinc-500">{NOTE}</p>

        <dl className="mt-5 grid gap-x-5 gap-y-4 md:grid-cols-2 xl:grid-cols-4">
          {rows.map((r) => (
            <div key={r.label} className="flex flex-col-reverse rounded-lg border border-zinc-200 px-4 py-3">
              <dt className="mt-1 text-xs font-medium tracking-wider text-zinc-500 uppercase">{r.label}</dt>
              <dd className={`text-lg font-semibold tabular-nums ${r.cls}`}>{r.value}</dd>
            </div>
          ))}
        </dl>
      </section>

      <ConfirmDelete
        noun="variant"
        name={confirming ? v.name : null}
        pending={remove.isPending}
        error={remove.error}
        onConfirm={() => remove.mutate()}
        onCancel={() => setConfirming(false)}
      />
    </>
  );
}
