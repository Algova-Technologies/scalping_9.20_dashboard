// Run: npm test
import assert from 'node:assert/strict';
import { AUTO_KEYS, blankSettings, fieldsFor, OPTIONAL_KEYS, settingFields, validateSettings, type SettingKey, type Settings } from './settingsForm';

// The live config row from the backend; must pass as-is.
const ok: Settings = {
  exch_seg: 'NFO', symbol_name: 'BANKNIFTY', expiry: '23NOV2026', expiry_cycle: 'nearest', lot_size: '1',
  product_type: 'INTRADAY', order_type: 'MARKET', base_price: '1100', delta_max_age: '30',
  ce_delta_min: '0.70', ce_delta_max: '0.80', pe_delta_min: '-0.80', pe_delta_max: '-0.70',
  number_of_trade_allowed: '1',
  index_symbol: 'Nifty Bank', index_token: '99926009', index_exch_seg: 'NSE',
  // single-variant engines' db_configs columns (each database's backend `fields` says which it has)
  sl: '10', tp: '10', engine_version: '1', interval: 'ONE_MINUTE', atr_length: '10', min_factor: '1', max_factor: '5',
  step: '0.5', from_cluster: 'Best', max_iter: '1000', number_of_records: '10000', perf_alpha: '10', base_brok_per_lot: '20',
  threshold_trade_price: '100', start_trading_hour: '9', start_trading_min: '20', end_trading_hour: '15', end_trading_min: '15',
  trade_mode: 'PAPER',
};
assert.deepEqual(validateSettings(ok), {});
// A blank form flags every required field; the three nullable index columns are exempt.
assert.equal(Object.keys(validateSettings(blankSettings)).length, settingFields.length - OPTIONAL_KEYS.length - AUTO_KEYS.length);
assert.equal(settingFields.length - OPTIONAL_KEYS.length - AUTO_KEYS.length, 32);
assert.ok(validateSettings({ ...ok, index_token: '99A' }).index_token);
// Every settings column is varchar(100): over-long must fail here, not as a 500 from MySQL.
assert.ok(validateSettings({ ...ok, base_price: '1'.repeat(120) }).base_price);
assert.ok(validateSettings({ ...ok, index_symbol: 'X'.repeat(120) }).index_symbol);
assert.deepEqual(validateSettings({ ...ok, index_symbol: 'X'.repeat(100) }), {});
// index_symbol / index_token / index_exch_seg are nullable columns: blank is allowed.
assert.deepEqual(validateSettings({ ...ok, index_symbol: '', index_token: '', index_exch_seg: '' }), {});
assert.ok(validateSettings({ ...ok, index_token: 'abc' }).index_token); // but a non-blank one must be digits
// expiry is engine-managed (read-only, never sent): whatever it holds is never an error, even blank before the first daily init.
assert.deepEqual(AUTO_KEYS, ['expiry']);
for (const v of ['', '31NOV2026', 'junk']) assert.deepEqual(validateSettings({ ...ok, expiry: v }), {}, v);
// the cycle is required and must be one the engine knows
assert.ok(validateSettings({ ...ok, expiry_cycle: '' }).expiry_cycle);
assert.ok(validateSettings({ ...ok, expiry_cycle: 'weekly' }).expiry_cycle);
assert.deepEqual(validateSettings({ ...ok, expiry_cycle: 'monthly' }), {});
assert.ok(validateSettings({ ...ok, lot_size: '0' }).lot_size);
assert.ok(validateSettings({ ...ok, lot_size: '1.5' }).lot_size);
assert.ok(validateSettings({ ...ok, base_price: '0' }).base_price);
assert.ok(validateSettings({ ...ok, number_of_trade_allowed: '0' }).number_of_trade_allowed);
// Each engine variant's form: only the fields its database has (the backend's `fields`).
const all = settingFields.map((f) => f.key);
const noDelta = all.filter((k) => k !== 'delta_max_age' && !k.includes('_delta_')) as SettingKey[];
const withDelta = all.filter((k) => k !== 'base_price') as SettingKey[];
assert.deepEqual(fieldsFor(withDelta).map((f) => f.key), withDelta); // keeps form order
assert.deepEqual(fieldsFor([...withDelta, 'no_such_column']).map((f) => f.key), withDelta);
// A field the project lacks is never required or checked, so its blank value is fine.
assert.deepEqual(validateSettings({ ...ok, delta_max_age: '' }, noDelta), {});
assert.deepEqual(validateSettings({ ...ok, base_price: '' }, withDelta), {});
assert.ok(validateSettings({ ...ok, base_price: '' }, noDelta).base_price);
assert.ok(validateSettings({ ...ok, delta_max_age: '' }, withDelta).delta_max_age);
for (const bad of ['0', '1.5', 'x']) assert.ok(validateSettings({ ...ok, delta_max_age: bad }, withDelta).delta_max_age, bad);
assert.equal(Object.keys(validateSettings(blankSettings, withDelta)).length, withDelta.length - OPTIONAL_KEYS.length - AUTO_KEYS.length);
// CE/PE delta bands: each on its side of zero, min <= max; PE is negative.
assert.deepEqual(validateSettings(ok, withDelta), {});
assert.ok(validateSettings({ ...ok, ce_delta_min: '1.2' }, withDelta).ce_delta_min);
assert.ok(validateSettings({ ...ok, pe_delta_max: '0.7' }, withDelta).pe_delta_max);
assert.ok(validateSettings({ ...ok, ce_delta_min: '0.9' }, withDelta).ce_delta_max); // min > max
assert.ok(validateSettings({ ...ok, pe_delta_min: '-0.6' }, withDelta).pe_delta_max);
// Engine rule: strictly ITM, CE in (0.5, 1], PE in [-1, -0.5).
for (const [k, bad] of [['ce_delta_min', '0.5'], ['ce_delta_min', '0.3'], ['pe_delta_max', '-0.5'], ['pe_delta_max', '0'], ['pe_delta_min', '0']] as const)
  assert.ok(validateSettings({ ...ok, [k]: bad }, withDelta)[k], `${k}=${bad}`);
assert.deepEqual(validateSettings({ ...ok, ce_delta_min: '0.51', ce_delta_max: '1', pe_delta_min: '-1', pe_delta_max: '-0.51' }, withDelta), {});
assert.deepEqual(validateSettings({ ...ok, ce_delta_min: '' }, noDelta), {});
// A single-variant engine (With Delta Paper's db_configs): its own SL/TP, checked; the rest of the form untouched.
const single = ['exch_seg', 'symbol_name', 'expiry', 'lot_size', 'product_type', 'order_type', 'sl', 'tp', 'number_of_trade_allowed',
  'index_symbol', 'index_token', 'index_exch_seg', 'delta_max_age'] as SettingKey[];
assert.deepEqual(validateSettings({ ...ok, base_price: '', trade_mode: '' }, single), {});
for (const bad of ['', '0', 'x']) assert.ok(validateSettings({ ...ok, sl: bad }, single).sl, bad);
assert.ok(validateSettings({ ...ok, tp: '-1' }, single).tp);
assert.ok(validateSettings({ ...ok, trade_mode: 'REAL' }, all).trade_mode);
assert.deepEqual(fieldsFor(single).map((f) => f.key).slice(6, 8), ['sl', 'tp']); // SL/TP sit right after order_type
console.log('settingsForm ok');
