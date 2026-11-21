import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Layers, Plus } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router';
import { btn, card, CardHeader, ConfirmDelete, Crumbs, dbApi, RowActions, Toggle, MissingProject } from '../../shared';
import type { Variant } from '../../variantForm';
import { NOTE, variantsTrail, useVariants } from '../../variants';
import { projectUrl } from '@/apps';

export function Component() {
  const { project: p, data, isPending, error } = useVariants();
  const qc = useQueryClient();
  const [confirming, setConfirming] = useState<Variant | null>(null);
  const remove = useMutation({
    mutationFn: (id: number) => dbApi(p!.db, `/api/varients/${id}`, { method: 'DELETE' }),
    onSuccess: () => setConfirming(null),
    onSettled: () => qc.invalidateQueries({ queryKey: ['variants', p?.db] }),
  });

  // Optimistic: the switch flips at once; on failure it snaps back and the error shows.
  const key = ['variants', p?.db];
  const status = useMutation({
    mutationFn: (v: { id: number; is_active: number }) =>
      dbApi(p!.db, `/api/varients/${v.id}/status`, { method: 'PATCH', body: JSON.stringify({ is_active: v.is_active }) }),
    onMutate: async (v) => {
      await qc.cancelQueries({ queryKey: key });
      const prev = qc.getQueryData<Variant[]>(key);
      qc.setQueryData<Variant[]>(key, (old) => old?.map((x) => (x.varient_id === v.id ? { ...x, is_active: v.is_active } : x)));
      return prev;
    },
    onError: (_e, _v, prev) => qc.setQueryData(key, prev),
    onSettled: () => qc.invalidateQueries({ queryKey: key }),
  });

  if (!p) return <MissingProject />;

  return (
    <>
      <Crumbs items={[...variantsTrail(p).slice(0, 3), { label: 'Manage Variants' }]} />
      <section className={card}>
        <CardHeader
          back={`${projectUrl(p.id)}`}
          title={
            <span className="inline-flex items-center gap-2">
              <Layers className="size-5" /> Manage Variants
            </span>
          }
        >
          <Link to="new" className={btn.success}>
            <Plus className="size-4" /> Add Variant
          </Link>
        </CardHeader>
        <p className="mt-4 text-sm text-zinc-500">{NOTE}</p>
        {status.error && <p className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">Status not saved: {status.error.message}</p>}

        {isPending ? (
          <p className="mt-5 py-8 text-center text-sm text-zinc-400">Loading…</p>
        ) : error ? (
          <p className="mt-5 py-8 text-center text-sm text-red-600">{error.message}</p>
        ) : data.length === 0 ? (
          <p className="mt-5 rounded-lg border border-zinc-200 py-8 text-center text-sm text-zinc-400">No variants yet.</p>
        ) : (
          <div className="mt-5 overflow-x-auto rounded-lg border border-zinc-200">
            <table className="w-full text-center text-sm">
              <thead className="border-b border-zinc-200 bg-zinc-50 text-xs font-medium tracking-wider text-zinc-500 uppercase">
                <tr className="divide-x divide-zinc-200">
                  <th className="px-3 py-3">Name</th>
                  <th className="px-3 py-3">SL</th>
                  <th className="px-3 py-3">TP</th>
                  <th className="px-3 py-3 whitespace-nowrap">Total Trades</th>
                  <th className="px-3 py-3">Status</th>
                  <th className="px-3 py-3 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200">
                {data.map((v) => (
                  <tr key={v.varient_id} className="divide-x divide-zinc-200 hover:bg-zinc-50">
                    <td className="px-3 py-3 font-medium">
                      <Link to={String(v.varient_id)} className="hover:underline">
                        {v.name}
                      </Link>
                      {!!v.is_default && <span className="ml-2 rounded bg-zinc-100 px-1.5 py-0.5 text-xs text-zinc-500">default</span>}
                    </td>
                    <td className="px-3 py-3 font-medium text-red-600 tabular-nums">{v.sl}</td>
                    <td className="px-3 py-3 font-medium text-emerald-600 tabular-nums">{v.tp}</td>
                    <td className="px-3 py-3 font-medium tabular-nums">{v.trade_count ?? 0}</td>
                    <td className="px-3 py-2">
                      <Toggle
                        on={!!v.is_active}
                        disabled={!!v.is_default}
                        label={`${v.name} ${v.is_active ? 'enabled' : 'disabled'}`}
                        onChange={() => status.mutate({ id: v.varient_id, is_active: v.is_active ? 0 : 1 })}
                      />
                    </td>
                    <td className="px-3 py-2 text-center whitespace-nowrap">
                      <RowActions name={v.name} edit={`${v.varient_id}/edit`} onDelete={v.is_default ? undefined : () => setConfirming(v)} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <ConfirmDelete
        noun="variant"
        name={confirming?.name ?? null}
        pending={remove.isPending}
        error={remove.error}
        onConfirm={() => confirming && remove.mutate(confirming.varient_id)}
        onCancel={() => setConfirming(null)}
      />
    </>
  );
}
