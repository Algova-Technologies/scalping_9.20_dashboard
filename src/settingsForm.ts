// Pure settings-form logic (no React), tested by settingsForm.test.ts.
// Values are strings end to end: the backend stores and returns every field as a string.

// auto: set by the engine (shown read-only, never validated or sent).
type Def = { key: string; label: string; placeholder: string; options?: string[]; upper?: boolean; numeric?: boolean; signed?: boolean; auto?: boolean };

// AngelOne values (the only broker wired up). The current value is always offered even if not listed.
export const settingFields = [
  { key: 'exch_seg', label: 'Exchange Segment', placeholder: 'e.g. NFO', options: ['NFO', 'BFO', 'NSE', 'BSE', 'MCX', 'CDS'] },
  { key: 'symbol_name', label: 'Symbol Name', placeholder: 'e.g. BANKNIFTY', upper: true },
  // The engine sets expiry every day from the exchange's listed expiries (Go strategy/expiry, table index_expiries);
  // expiry_cycle chooses which one: the nearest (weekly where the index has weeklies) or the month's last.
  { key: 'expiry', label: 'Expiry (auto)', placeholder: 'Set by the engine at its next daily init', upper: true, auto: true },
  { key: 'expiry_cycle', label: 'Expiry Cycle', placeholder: 'Select expiry cycle', options: ['nearest', 'monthly'] },
  { key: 'lot_size', label: 'Lot Size', placeholder: 'e.g. 30', numeric: true },
  { key: 'product_type', label: 'Product Type', placeholder: 'Select product type', options: ['INTRADAY', 'DELIVERY', 'CARRYFORWARD', 'MARGIN', 'BO'] },
  { key: 'order_type', label: 'Order Type', placeholder: 'Select order type', options: ['MARKET', 'LIMIT', 'STOPLOSS_LIMIT', 'STOPLOSS_MARKET'] },
  // Single-variant engines (db_configs): their one variant's SL/TP lives here, not in Manage Variants.
  { key: 'sl', label: 'Stop Loss (points)', placeholder: 'e.g. 10', numeric: true },
  { key: 'tp', label: 'Target (points)', placeholder: 'e.g. 10', numeric: true },
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
  // The No Delta Paper engine's SuperTrend and session settings (its db_configs only; stored as strings).
  { key: 'engine_version', label: 'Engine Version', placeholder: 'e.g. 1' },
  { key: 'interval', label: 'Interval', placeholder: 'e.g. ONE_MINUTE' },
  { key: 'atr_length', label: 'ATR Length', placeholder: 'e.g. 10', numeric: true },
  { key: 'min_factor', label: 'Min Factor', placeholder: 'e.g. 1', numeric: true },
  { key: 'max_factor', label: 'Max Factor', placeholder: 'e.g. 5', numeric: true },
  { key: 'step', label: 'Step', placeholder: 'e.g. 0.5', numeric: true },
  { key: 'from_cluster', label: 'From Cluster', placeholder: 'e.g. Best' },
  { key: 'max_iter', label: 'Max Iterations', placeholder: 'e.g. 1000', numeric: true },
  { key: 'number_of_records', label: 'Number of Records', placeholder: 'e.g. 10000', numeric: true },
  { key: 'perf_alpha', label: 'Performance Alpha', placeholder: 'e.g. 10', numeric: true },
  { key: 'base_brok_per_lot', label: 'Base Brokerage per Lot', placeholder: 'e.g. 20', numeric: true },
  { key: 'threshold_trade_price', label: 'Threshold Trade Price', placeholder: 'e.g. 100', numeric: true },
  { key: 'start_trading_hour', label: 'Start Trading Hour', placeholder: 'e.g. 9', numeric: true },
  { key: 'start_trading_min', label: 'Start Trading Minute', placeholder: 'e.g. 20', numeric: true },
  { key: 'end_trading_hour', label: 'End Trading Hour', placeholder: 'e.g. 15', numeric: true },
  { key: 'end_trading_min', label: 'End Trading Minute', placeholder: 'e.g. 15', numeric: true },
  { key: 'trade_mode', label: 'Trade Mode', placeholder: 'Select trade mode', options: ['PAPER', 'LIVE'] },
] as const satisfies readonly Def[];

export type SettingKey = (typeof settingFields)[number]['key'];
// Set by the engine, not by the form: shown read-only, never validated or sent.
export const AUTO_KEYS = settingFields.filter((f) => 'auto' in f && f.auto).map((f) => f.key) as readonly SettingKey[];
// The only settings columns that are nullable in the engine's schema.
export const OPTIONAL_KEYS = ['index_symbol', 'index_token', 'index_exch_seg'] as readonly SettingKey[];
export type Settings = Record<SettingKey, string>;
export const blankSettings = Object.fromEntries(settingFields.map((f) => [f.key, ''])) as Settings;

const isNum = (v: string) => /^\d+(\.\d+)?$/.test(v);
const isInt = (v: string) => /^\d+$/.test(v);

// The fields a project's database has (the backend's `fields`); unknown names are dropped.
export const fieldsFor = (keys: readonly string[]) => settingFields.filter((f) => keys.includes(f.key));

// Field → message for every invalid field among `keys` (default: all); empty object means valid.
export function validateSettings(s: Settings, keys: readonly SettingKey[] = settingFields.map((f) => f.key)) {
  const e: Partial<Record<SettingKey, string>> = {};
  keys = keys.filter((k) => !AUTO_KEYS.includes(k)); // engine-managed: nothing to validate
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
  check('expiry_cycle', ['nearest', 'monthly'].includes(s.expiry_cycle), 'Select nearest or monthly');
  check('lot_size', isInt(s.lot_size) && +s.lot_size > 0, 'Lot size must be a whole number above 0');
  check('base_price', isNum(s.base_price) && +s.base_price > 0, 'Must be a number above 0');
  check('delta_max_age', isInt(s.delta_max_age) && +s.delta_max_age > 0, 'Must be a whole number of seconds above 0');
  // Delta bands (varchar(20)), the engine's DeltaBand.Valid(): strictly ITM, CE in (0.5, 1], PE in [-1, -0.5), min <= max.
  // Outside this the engine silently falls back to its default band.
  for (const [ok, msg, a, b] of [
    [(x: number) => x > 0.5 && x <= 1, 'Must be above 0.5 and at most 1', 'ce_delta_min', 'ce_delta_max'],
    [(x: number) => x >= -1 && x < -0.5, 'Must be at least -1 and below -0.5', 'pe_delta_min', 'pe_delta_max'],
  ] as const) {
    for (const k of [a, b]) check(k, /^-?\d+(\.\d+)?$/.test(s[k]) && s[k].length <= 20 && ok(+s[k]), msg);
    check(b, +s[a] <= +s[b], 'Max must be at least Min');
  }
  check('index_token', !s.index_token.trim() || isInt(s.index_token), 'Index token must be digits only');
  check('number_of_trade_allowed', isInt(s.number_of_trade_allowed) && +s.number_of_trade_allowed > 0, 'Must be a whole number above 0');
  for (const k of ['sl', 'tp'] as const) check(k, isNum(s[k]) && +s[k] > 0, 'Must be a number of points above 0');
  check('trade_mode', ['PAPER', 'LIVE'].includes(s.trade_mode), 'Select PAPER or LIVE');
  return e;
}
