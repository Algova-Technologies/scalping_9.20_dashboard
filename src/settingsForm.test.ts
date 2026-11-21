// Run: npm test
import assert from 'node:assert/strict';
import { blankSettings, fieldsFor, OPTIONAL_KEYS, settingFields, validateSettings, type SettingKey, type Settings } from './settingsForm';

// The live config row from the backend; must pass as-is.
const ok: Settings = {
  exch_seg: 'NFO', symbol_name: 'BANKNIFTY', expiry: '23NOV2026', lot_size: '1',
  product_type: 'INTRADAY', order_type: 'MARKET', base_price: '1100', delta_max_age: '30',
  ce_delta_min: '0.70', ce_delta_max: '0.80', pe_delta_min: '-0.80', pe_delta_max: '-0.70',
  number_of_trade_allowed: '1',
  index_symbol: 'Nifty Bank', index_token: '99926009', index_exch_seg: 'NSE',
};
assert.deepEqual(validateSettings(ok), {});
// A blank form flags every required field; the three nullable index columns are exempt.
assert.equal(Object.keys(validateSettings(blankSettings)).length, settingFields.length - OPTIONAL_KEYS.length);
assert.equal(settingFields.length - OPTIONAL_KEYS.length, 13);
assert.ok(validateSettings({ ...ok, index_token: '99A' }).index_token);
// Every settings column is varchar(100): over-long must fail here, not as a 500 from MySQL.
assert.ok(validateSettings({ ...ok, base_price: '1'.repeat(120) }).base_price);
assert.ok(validateSettings({ ...ok, index_symbol: 'X'.repeat(120) }).index_symbol);
assert.deepEqual(validateSettings({ ...ok, index_symbol: 'X'.repeat(100) }), {});
// index_symbol / index_token / index_exch_seg are nullable columns: blank is allowed.
assert.deepEqual(validateSettings({ ...ok, index_symbol: '', index_token: '', index_exch_seg: '' }), {});
assert.ok(validateSettings({ ...ok, index_token: 'abc' }).index_token); // but a non-blank one must be digits
assert.ok(validateSettings({ ...ok, expiry: '31NOV2026' }).expiry); // no 31st in Nov
assert.ok(validateSettings({ ...ok, expiry: '23XYZ2026' }).expiry);
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
assert.equal(Object.keys(validateSettings(blankSettings, withDelta)).length, withDelta.length - OPTIONAL_KEYS.length);
// CE/PE delta bands: each on its side of zero, min <= max; PE is negative.
assert.deepEqual(validateSettings(ok, withDelta), {});
assert.ok(validateSettings({ ...ok, ce_delta_min: '1.2' }, withDelta).ce_delta_min);
assert.ok(validateSettings({ ...ok, pe_delta_max: '0.7' }, withDelta).pe_delta_max);
assert.ok(validateSettings({ ...ok, ce_delta_min: '0.9' }, withDelta).ce_delta_max); // min > max
assert.ok(validateSettings({ ...ok, pe_delta_min: '-0.6' }, withDelta).pe_delta_max);
assert.deepEqual(validateSettings({ ...ok, ce_delta_min: '' }, noDelta), {});
console.log('settingsForm ok');
