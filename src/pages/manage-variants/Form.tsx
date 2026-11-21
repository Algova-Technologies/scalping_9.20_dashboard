import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Check } from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import type { Project } from '../../projects';
import { btn, card, CardHeader, Crumbs, dbApi, Notice, MissingProject } from '../../shared';
import { blankVariant, validateVariant, type Variant, type VariantForm } from '../../variantForm';
import { NOTE, variantsTrail, variantsUrl, useVariants } from '../../variants';

// One screen for create (/manage-variants/new, blank) and edit (/manage-variants/:variantId/edit, pre-filled).
export function Component() {
  const { project: p, variantId, variant, data, isPending, error } = useVariants();
  if (!p) return <MissingProject />;
  if (isPending) return <Notice>Loading…</Notice>;
  if (error) return <Notice>{error.message}</Notice>;
  if (variantId && !variant) return <Notice>Variant not found.</Notice>;
  return <Editor key={variantId ?? 'new'} p={p} variant={variant} all={data} />;
}

const fields = [
  { key: 'name', label: 'Name', placeholder: 'e.g. 10/20', hint: '' },
  { key: 'sl', label: 'Stop Loss (SL)', placeholder: 'e.g. 10', hint: 'points' },
  { key: 'tp', label: 'Take Profit (TP)', placeholder: 'e.g. 20', hint: 'points' },
] as const;

function Editor({ p, variant, all }: { p: Project; variant?: Variant; all: Variant[] }) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const list = variantsUrl(p);
  const [form, setForm] = useState<VariantForm>(() =>
    variant ? { name: variant.name, sl: String(variant.sl), tp: String(variant.tp) } : blankVariant,
  );
  const [submitted, setSubmitted] = useState(false);
  const errors = validateVariant(form, all.filter((v) => v.varient_id !== variant?.varient_id));
  const valid = Object.keys(errors).length === 0;

  const save = useMutation({
    mutationFn: () =>
      dbApi<Variant>(p.db, variant ? `/api/varients/${variant.varient_id}` : '/api/varients', {
        method: variant ? 'PUT' : 'POST',
        body: JSON.stringify({ name: form.name.trim(), sl: +form.sl, tp: +form.tp }),
      }),
    onSuccess: async (saved) => {
      await qc.invalidateQueries({ queryKey: ['variants', p.db] });
      navigate(`${list}/${saved.varient_id}`);
    },
  });

  const back = variant ? `${list}/${variant.varient_id}` : list;
  return (
    <>
      <Crumbs items={[...variantsTrail(p), ...(variant ? [{ label: variant.name, to: back }, { label: 'Edit' }] : [{ label: 'New Variant' }])]} />
      <form
        noValidate
        className={card}
        onSubmit={(e) => {
          e.preventDefault();
          setSubmitted(true);
          if (valid) save.mutate();
        }}
      >
        <CardHeader back={back} title={variant ? 'Edit Variant' : 'Create New Variant'} />
        <p className="mt-4 text-sm text-zinc-500">{NOTE}</p>
        {save.error && <p className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{save.error.message}</p>}

        <div className="mt-5 grid gap-x-5 gap-y-4 md:grid-cols-2 xl:grid-cols-4">
          {fields.map((f) => {
            const err = submitted ? errors[f.key] : undefined;
            return (
              <div key={f.key}>
                <label htmlFor={f.key} className="mb-1.5 block text-sm font-medium text-zinc-700">
                  <span className="text-red-500">* </span>
                  {f.label}
                  {f.hint && <span className="ml-1 text-xs font-normal text-zinc-500">({f.hint})</span>}
                </label>
                <input
                  id={f.key}
                  value={form[f.key]}
                  placeholder={f.placeholder}
                  inputMode={f.key === 'name' ? undefined : 'numeric'}
                  disabled={!!variant?.is_default && f.key !== 'name'} // the default 5/5's levels are fixed
                  autoComplete="off"
                  aria-invalid={!!err}
                  aria-describedby={err ? `${f.key}-err` : undefined}
                  onChange={(e) => {
                    const v = f.key === 'name' ? e.target.value : e.target.value.replace(/\D/g, '').slice(0, 7);
                    setForm((s) => ({ ...s, [f.key]: v }));
                  }}
                  className={`h-10 w-full rounded-md border bg-white px-3 text-sm placeholder:text-zinc-400 focus:ring-2 focus:outline-none disabled:cursor-not-allowed disabled:bg-zinc-100 disabled:text-zinc-500 ${
                    err ? 'border-red-400 focus:ring-red-100' : 'border-zinc-300 focus:ring-blue-100'
                  }`}
                />
                {err && (
                  <p id={`${f.key}-err`} className="mt-1 text-xs text-red-600">
                    {err}
                  </p>
                )}
              </div>
            );
          })}
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <Link to={back} className={btn.secondary}>
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
