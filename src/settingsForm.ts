// Pure settings-form logic (no React), tested by settingsForm.test.ts.
// Values are strings end to end: the backend stores and returns every field as a string.

type Def = { key: string; label: string; placeholder: string; options?: string[]; upper?: boolean; numeric?: boolean; signed?: boolean };

// AngelOne values (the only broker wired up). The current value is always offered even if not listed.
export const settingFields = [
  { key: 'exch_seg', label: 'Exchange Segment', placeholder: 'e.g. NFO', options: ['NFO', 'BFO', 'NSE', 'BSE', 'MCX', 'CDS'] },
  { key: 'symbol_name', label: 'Symbol Name', placeholder: 'e.g. BANKNIFTY', upper: true },
  { key: 'expiry', label: 'Expiry', placeholder: 'DDMMMYYYY, e.g. 23NOV2026', upper: true },
  { key: 'lot_size', label: 'Lot Size', placeholder: 'e.g. 30', numeric: true },
  { key: 'product_type', label: 'Product Type', placeholder: 'Select product type', options: ['INTRADAY', 'DELIVERY', 'CARRYFORWARD', 'MARGIN', 'BO'] },
  { key: 'order_type', label: 'Order Type', placeholder: 'Select order type', options: ['MARKET', 'LIMIT', 'STOPLOSS_LIMIT', 'STOPLOSS_MARKET'] },
  // Variant fields: no_delta has base_price, with_delta has delta_max_age and the CE/PE delta bands. The backend's `fields` says which.
  { key: 'base_price', label: 'Base Price', placeholder: 'e.g. 1100', numeric: true },
  { key: 'delta_max_age', label: 'Delta Max Age (seconds)', placeholder: 'e.g. 30', numeric: true },
  { key: 'ce_delta_min', label: 'CE Delta Min', placeholder: 'e.g. 0.70', numeric: true },
  { key: 'ce_delta_max', label: 'CE Delta Max', placeholder: 'e.g. 0.80', numeric: true },
  { key: 'pe_delta_min', label: 'PE Delta Min', placeholder: 'e.g. -0.80', numeric: true, signed: true },
  { key: 'pe_delta_max', label: 'PE Delta Max', placeholder: 'e.g. -0.70', numeric: true, signed: true },
  { key: 'number_of_trade_allowed', label: 'Number of Trade Allowed', placeholder: 'e.g. 1', numeric: true },
  { key: 'index_symbol', label: 'Index Symbol', placeholder: 'e.g. Nifty Bank' },
  { key: 'index_token', label: 'Index Token', placeholder: 'e.g. 99926009', numeric: true },
  { key: 'index_exch_seg', label: 'Index Exchange Segment', placeholder: 'e.g. NSE', options: ['NSE', 'BSE', 'MCX'] },
] as const satisfies readonly Def[];

export type SettingKey = (typeof settingFields)[number]['key'];
// The only settings columns that are nullable in the engine's schema.
export const OPTIONAL_KEYS = ['index_symbol', 'index_token', 'index_exch_seg'] as readonly SettingKey[];
export type Settings = Record<SettingKey, string>;
export const blankSettings = Object.fromEntries(settingFields.map((f) => [f.key, ''])) as Settings;

const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
const isNum = (v: string) => /^\d+(\.\d+)?$/.test(v);
const isInt = (v: string) => /^\d+$/.test(v);

// The fields a project's database has (the backend's `fields`); unknown names are dropped.
export const fieldsFor = (keys: readonly string[]) => settingFields.filter((f) => keys.includes(f.key));

// Field → message for every invalid field among `keys` (default: all); empty object means valid.
export function validateSettings(s: Settings, keys: readonly SettingKey[] = settingFields.map((f) => f.key)) {
  const e: Partial<Record<SettingKey, string>> = {};
  const fields = fieldsFor(keys);
  // Nullable columns: a blank field is stored as NULL, so it isn't an error.
  for (const f of fields)
    if (!OPTIONAL_KEYS.includes(f.key) && !s[f.key].trim()) e[f.key] = `${f.label} is required`;
  // Every settings column is varchar(100), so one cap covers the lot (and any field added later).
  for (const f of fields)
    if (!e[f.key] && s[f.key].length > 100) e[f.key] = `${f.label} must be at most 100 characters`;
  const check = (k: SettingKey, ok: boolean, msg: string) => {
    if (keys.includes(k) && !e[k] && !ok) e[k] = msg;
  };

  check('symbol_name', /^[A-Z0-9&_-]+$/.test(s.symbol_name), 'Use capital letters, digits, &, _ or - only');
  const m = /^(\d{2})([A-Z]{3})(\d{4})$/.exec(s.expiry);
  const mi = m ? MONTHS.indexOf(m[2]) : -1;
  const d = m && new Date(+m[3], mi, +m[1]);
  check('expiry', !!d && mi >= 0 && d.getDate() === +m![1], 'Enter a real date as DDMMMYYYY, e.g. 23NOV2026');
  check('lot_size', isInt(s.lot_size) && +s.lot_size > 0, 'Lot size must be a whole number above 0');
  check('base_price', isNum(s.base_price) && +s.base_price > 0, 'Must be a number above 0');
  check('delta_max_age', isInt(s.delta_max_age) && +s.delta_max_age > 0, 'Must be a whole number of seconds above 0');
  // Delta bands (varchar(20)): CE within 0..1, PE within -1..0, min <= max.
  for (const [lo, hi, a, b] of [[0, 1, 'ce_delta_min', 'ce_delta_max'], [-1, 0, 'pe_delta_min', 'pe_delta_max']] as const) {
    for (const k of [a, b]) check(k, /^-?\d+(\.\d+)?$/.test(s[k]) && s[k].length <= 20 && +s[k] >= lo && +s[k] <= hi, `Must be a number from ${lo} to ${hi}`);
    check(b, +s[a] <= +s[b], 'Max must be at least Min');
  }
  check('index_token', !s.index_token.trim() || isInt(s.index_token), 'Index token must be digits only');
  check('number_of_trade_allowed', isInt(s.number_of_trade_allowed) && +s.number_of_trade_allowed > 0, 'Must be a whole number above 0');
  return e;
}
