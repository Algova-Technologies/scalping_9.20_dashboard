// Run: npm test
import assert from 'node:assert/strict';
import { type ApiTrade, byVariant, days, fromApi, stats, wallMs, weeks } from './metrics';

const base: ApiTrade = {
  id: 1, variant_id: 1, user_id: 1, symbol: 'BANKNIFTY23NOV2661600PE', option_type: 'PE', strike: '61600',
  qty: 30, exit_qty: 30, entry_price: 1128.4, exit_price: 1143.6,
  entry_at: '2026-11-12T09:20:20.442000', exit_at: '2026-11-12T09:20:23.210000',
  pnl: 347.9349, charges: 108.0651, invested: 33852, exit_type: 'tp',
};
const mk = (o: Partial<ApiTrade>) => fromApi({ ...base, ...o });

// Parsing: 6-digit fractions, duration from entry→exit, entry clock, trade day.
assert.equal(wallMs('2026-11-12T09:20:23.210000')! - wallMs('2026-11-12T09:20:20.442000')!, 2768);
const t = mk({});
assert.equal(t.durSec, 2.768);
assert.equal(t.entrySec, 9 * 3600 + 20 * 60 + 20);
assert.equal(t.date, '2026-11-12');
assert.equal(mk({ exit_at: null }).durSec, 0); // still open: no duration, day = entry day
assert.equal(mk({ exit_at: null }).date, '2026-11-12');
assert.equal(mk({ entry_at: '2026-11-12T15:29:00', exit_at: '2026-11-13T09:16:00' }).date, '2026-11-13'); // day = exit day

// Two days in one ISO week (Mon 9 Nov, Thu 12 Nov) + one the week before.
const trades = [
  mk({ id: 1, entry_at: '2026-11-09T09:20:00', exit_at: '2026-11-09T09:20:10', pnl: 100, invested: 1000 }),
  mk({ id: 2, entry_at: '2026-11-09T10:00:00', exit_at: '2026-11-09T10:00:30', pnl: -40, invested: 1000, strike: '61700' }),
  mk({ id: 3, entry_at: '2026-11-12T09:20:00', exit_at: '2026-11-12T09:20:20', pnl: 60, invested: 2000 }),
  mk({ id: 4, entry_at: '2026-11-06T09:20:00', exit_at: '2026-11-06T09:20:40', pnl: -10, invested: 500 }),
];
const ds = days(trades);
assert.deepEqual(ds.map((d) => [d.date, d.trades, d.pnl, d.entryStrike, d.exitStrike]), [
  ['2026-11-06', 1, -10, '61600', '61600'],
  ['2026-11-09', 2, 60, '61600', '61700'],
  ['2026-11-12', 1, 60, '61600', '61600'],
]);
assert.equal(ds[1].avgSec, 20);

const ws = weeks(trades);
assert.deepEqual(ws.map((w) => [w.key, w.trades, w.pnl, w.total]), [
  ['2026-11-09', 3, 120, 110], // newest first; running total includes the earlier week
  ['2026-11-02', 1, -10, -10],
]);
assert.equal(ws[0].pct, 3); // 120 / 4000
assert.equal(ws[0].avgSec, 20); // (10 + 30 + 20) / 3

const byTrade = stats(trades, 'trade');
assert.deepEqual([byTrade.total, byTrade.profitable, byTrade.losing, byTrade.totalPnl], [4, 2, 2, 110]);
assert.equal(byTrade.avgPnl, 27.5);
const byDay = stats(trades, 'daily');
assert.deepEqual([byDay.total, byDay.profitable, byDay.losing], [3, 2, 1]);
const byWeek = stats(trades, 'weekly');
assert.deepEqual([byWeek.total, byWeek.profitable, byWeek.losing, byWeek.totalPnl], [2, 1, 1, 110]);
assert.equal(byWeek.avgSec, 25); // always per trade: (10+30+20+40)/4
// Monthly: all four are November; a late-October trade (same ISO week as none of them) is its own month,
// and a trade exiting 1 Dec after entering 30 Nov belongs to December (day = exit day).
const byMonth = stats(
  [...trades, mk({ id: 7, entry_at: '2026-10-30T09:20:00', exit_at: '2026-10-30T09:21:00', pnl: -50, invested: 1000 }),
    mk({ id: 8, entry_at: '2026-11-30T15:29:00', exit_at: '2026-12-01T09:16:00', pnl: 20, invested: 1000 })],
  'monthly',
);
assert.deepEqual([byMonth.total, byMonth.profitable, byMonth.losing, byMonth.totalPnl], [3, 2, 1, 80]);
assert.equal(byMonth.avgPnl, 80 / 3);
assert.equal(stats(trades, 'monthly').avgPct, 110 / 4500 * 100);
// Compare's count rows count trades: plain totals trade-wise, averaged per day/week/month otherwise.
const per = (g: Parameters<typeof stats>[1]) => {
  const s = stats(trades, g);
  return [s.tradesPer, s.profitableTradesPer, s.losingTradesPer];
};
assert.deepEqual(per('trade'), [4, 2, 2]);
assert.deepEqual(per('daily'), [4 / 3, 2 / 3, 2 / 3]); // 3 days
assert.deepEqual(per('weekly'), [2, 1, 1]); // 2 weeks
assert.deepEqual(per('monthly'), [4, 2, 2]); // 1 month
{ const e = stats([], 'daily'); assert.deepEqual([e.tradesPer, e.profitableTradesPer, e.losingTradesPer], [0, 0, 0]); } // one month: 110 / (1000+1000+2000+500)

// byVariant groups in one pass; Project/Compare use it instead of one filter per variant,
// so grouped stats must equal what filtering produced.
const mixed = [...trades, mk({ id: 5, variant_id: 2, pnl: 7, invested: 100 }), mk({ id: 6, variant_id: null, pnl: 3, invested: 100 })];
const groups = byVariant(mixed);
assert.deepEqual([...groups.keys()], [1, 2, null]); // trades of a deleted variant keep their own group
assert.equal(groups.get(null as unknown as number)?.length, 1);
for (const v of [1, 2, null]) {
  assert.deepEqual(
    stats(groups.get(v as number) ?? [], 'trade'),
    stats(mixed.filter((t) => t.variantId === v), 'trade'),
  );
}
assert.deepEqual(stats(groups.get(99) ?? [], 'trade'), stats([], 'trade')); // unknown variant

const empty = stats([], 'trade');
assert.deepEqual([empty.total, empty.avgPnl, empty.avgSec], [0, 0, 0]);
console.log('metrics ok');
