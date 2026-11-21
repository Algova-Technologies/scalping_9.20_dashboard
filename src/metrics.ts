// Pure trade maths (no React), tested by metrics.test.ts. One source for every screen:
// weekly/daily/trades tables, project home cards and Compare all derive from these.
// PnL is net of charges and investment is entry_price × qty; both come computed from the API.

export type ApiTrade = {
  id: number;
  variant_id: number | null;
  user_id: number;
  symbol: string | null;
  option_type: string | null;
  strike: string | null;
  qty: number;
  exit_qty: number;
  entry_price: number;
  exit_price: number;
  entry_at: string | null; // naive IST "YYYY-MM-DDTHH:MM:SS[.ffffff]"
  exit_at: string | null;
  pnl: number;
  charges: number;
  invested: number;
  exit_type: string | null;
};

export type Trade = {
  id: string;
  variantId: number | null;
  date: string; // YYYY-MM-DD: exit day, or entry day if not exited (matches the backend's "today")
  symbol: string;
  type: string;
  strike: string;
  qty: number;
  exitQty: number;
  entrySec: number; // seconds since midnight
  durSec: number;
  entryPrice: number;
  exitPrice: number;
  pnl: number;
  invested: number;
};

// Naive timestamp → ms on the local wall clock. Avoids Date's parsing of 6-digit fractions.
export function wallMs(s: string | null): number | null {
  const m = s && /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2}):(\d{2})(?:\.(\d{1,6}))?/.exec(s);
  if (!m) return null;
  const ms = m[7] ? Math.floor(Number(m[7].padEnd(6, '0')) / 1000) : 0;
  return new Date(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +m[6], ms).getTime();
}

export function fromApi(t: ApiTrade): Trade {
  const entry = wallMs(t.entry_at);
  const exit = wallMs(t.exit_at);
  const when = t.exit_at ?? t.entry_at ?? '';
  const [h, mi, se] = (t.entry_at ?? '').slice(11, 19).split(':').map(Number);
  return {
    id: String(t.id),
    variantId: t.variant_id,
    date: when.slice(0, 10),
    symbol: t.symbol ?? '',
    type: t.option_type ?? '',
    strike: t.strike ?? '',
    qty: t.qty,
    exitQty: t.exit_qty,
    entrySec: (h || 0) * 3600 + (mi || 0) * 60 + (se || 0),
    durSec: entry !== null && exit !== null && exit >= entry ? (exit - entry) / 1000 : 0,
    entryPrice: t.entry_price,
    exitPrice: t.exit_price,
    pnl: t.pnl,
    invested: t.invested,
  };
}

// ---- dates ----
export const parse = (d: string) => new Date(d + 'T00:00'); // local midnight, not UTC
export const ymd = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
export const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
export const monday = (d: Date) => addDays(d, -((d.getDay() + 6) % 7));
export function isoWeek(d: Date) {
  const thu = addDays(d, 3 - ((d.getDay() + 6) % 7));
  const jan4 = new Date(thu.getFullYear(), 0, 4);
  return 1 + Math.round(((thu.getTime() - jan4.getTime()) / 864e5 - 3 + ((jan4.getDay() + 6) % 7)) / 7);
}
export const sum = <T>(xs: T[], f: (x: T) => number) => xs.reduce((a, x) => a + f(x), 0);
export const pct = (pnl: number, invested: number) => (invested ? (pnl / invested) * 100 : 0);

// ---- grouping: trades → days → weeks, so every level agrees ----
export function days(trades: Trade[]) {
  const sorted = [...trades].sort((a, b) => a.date.localeCompare(b.date) || a.entrySec - b.entrySec);
  return [...Map.groupBy(sorted, (t) => t.date).entries()].map(([date, ts]) => ({
    date,
    trades: ts.length,
    entryStrike: ts[0].strike,
    exitStrike: ts[ts.length - 1].strike,
    entryQty: sum(ts, (t) => t.qty),
    exitQty: sum(ts, (t) => t.exitQty),
    pnl: sum(ts, (t) => t.pnl),
    invested: sum(ts, (t) => t.invested),
    avgSec: sum(ts, (t) => t.durSec) / ts.length,
  }));
}

export function weeks(trades: Trade[]) {
  const groups = Map.groupBy(days(trades), (d) => ymd(monday(parse(d.date))));
  let running = 0;
  return [...groups.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, ds]) => {
      const pnl = sum(ds, (d) => d.pnl);
      const invested = sum(ds, (d) => d.invested);
      const n = sum(ds, (d) => d.trades);
      return {
        key,
        start: parse(key),
        pnl,
        total: (running += pnl),
        invested,
        pct: pct(pnl, invested),
        trades: n,
        avgSec: sum(ds, (d) => d.avgSec * d.trades) / n,
      };
    })
    .reverse(); // newest first
}

// Group once by variant, so a screen with N variants makes one pass over the trades
// instead of N filtering passes.
export const byVariant = (trades: Trade[]) => Map.groupBy(trades, (t) => t.variantId);

// ---- per-variant summary at a grain (Compare, project home) ----
export type Grain = 'monthly' | 'weekly' | 'daily' | 'trade';
const grainKey: Record<Grain, (t: Trade) => string> = {
  monthly: (t) => t.date.slice(0, 7), // YYYY-MM
  weekly: (t) => ymd(monday(parse(t.date))),
  daily: (t) => t.date,
  trade: (t) => t.id,
};

export function stats(trades: Trade[], grain: Grain) {
  const units = [...Map.groupBy(trades, grainKey[grain]).values()].map((ts) => {
    const p = sum(ts, (t) => t.pnl);
    const inv = sum(ts, (t) => t.invested);
    return { pnl: p, invested: inv, pct: pct(p, inv) };
  });
  const n = units.length || 1;
  const per = grain === 'trade' ? 1 : n;
  return {
    totalPnl: sum(units, (u) => u.pnl),
    avgPnl: sum(units, (u) => u.pnl) / n,
    avgPct: sum(units, (u) => u.pct) / n,
    avgSec: sum(trades, (t) => t.durSec) / (trades.length || 1),
    avgInvested: sum(units, (u) => u.invested) / n,
    total: units.length, // days/weeks/months/trades, per the grain
    losing: units.filter((u) => u.pnl < 0).length,
    profitable: units.filter((u) => u.pnl > 0).length,
    // Trade counts averaged per unit (trade grain: the plain totals). Compare's count rows.
    tradesPer: trades.length / per,
    profitableTradesPer: trades.filter((t) => t.pnl > 0).length / per,
    losingTradesPer: trades.filter((t) => t.pnl < 0).length / per,
  };
}
export type Stats = ReturnType<typeof stats>;
