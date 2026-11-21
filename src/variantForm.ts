// Pure variant-form logic (no React), tested by variantForm.test.ts.
// Mirrors the backend: name 1-100 chars (trimmed), sl/tp whole points in 1..1,000,000.

// trade_count only comes from the list endpoint (completed trades).
export type Variant = { varient_id: number; name: string; sl: number; tp: number; is_active: number; is_default?: number; trade_count?: number };
export type VariantForm = { name: string; sl: string; tp: string };
export const blankVariant: VariantForm = { name: '', sl: '', tp: '' };

const MAX_POINTS = 1_000_000;

// others: every other variant, for the duplicate-name check (case-insensitive).
export function validateVariant(f: VariantForm, others: Pick<Variant, 'name'>[]) {
  const e: Partial<Record<keyof VariantForm, string>> = {};
  const name = f.name.trim();
  if (!name) e.name = 'Name is required';
  else if (name.length > 100) e.name = 'Name must be at most 100 characters';
  else if (others.some((o) => o.name.trim().toLowerCase() === name.toLowerCase())) e.name = 'A variant with this name already exists';
  for (const [k, label] of [['sl', 'Stop loss'], ['tp', 'Take profit']] as const) {
    if (!f[k]) e[k] = `${label} is required`;
    else if (!/^\d+$/.test(f[k]) || +f[k] < 1 || +f[k] > MAX_POINTS) e[k] = `${label} must be a whole number from 1 to ${MAX_POINTS.toLocaleString('en-IN')}`;
  }
  return e;
}
