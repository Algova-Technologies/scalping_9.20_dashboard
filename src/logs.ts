// Pure logs helpers (no React), tested by logs.test.ts.

// URL ?type= slug ↔ backend type. `short` labels the type filter on the logs list.
export const logTypes = [
  { slug: 'account-success', type: 'account_success', label: 'Account success logs', short: 'Account success' },
  { slug: 'account-error', type: 'account_error', label: 'Account error logs', short: 'Account error' },
  { slug: 'account-warning', type: 'account_warning', label: 'Account warning logs', short: 'Account warning' },
  { slug: 'engine-success', type: 'engine_success', label: 'Engine success logs', short: 'Engine success' },
  { slug: 'engine-error', type: 'engine_error', label: 'Engine error logs', short: 'Engine error' },
  { slug: 'engine-warning', type: 'engine_warning', label: 'Engine warning logs', short: 'Engine warning' },
] as const;
export const PAGE_SIZES = [25, 50, 100, 200] as const;

export type Log = {
  id: string;
  type: string;
  date_time: string | null;
  message: string | null;
  log_origin: string | null;
  function_name: string | null;
  line_number: string | null;
};
export type LogsPage = { logs: Log[]; total: number; page: number; page_size: number };

// Page buttons to show: first, last, and current ±1, with "…" for skipped runs.
// e.g. pageWindow(10, 20) → [1, '…', 9, 10, 11, '…', 20]
export function pageWindow(current: number, last: number): (number | '…')[] {
  const keep = new Set([1, last, current - 1, current, current + 1].filter((n) => n >= 1 && n <= last));
  const nums = [...keep].sort((a, b) => a - b);
  const out: (number | '…')[] = [];
  nums.forEach((n, i) => {
    if (i > 0 && n - nums[i - 1] === 2) out.push(n - 1); // a gap of one page: show it, not "…"
    else if (i > 0 && n - nums[i - 1] > 2) out.push('…');
    out.push(n);
  });
  return out;
}

// "2026-11-12T15:20:59.016" (naive, already IST) → "12 Nov 2026, 03:20:59 PM". Read as wall-clock, no zone shift.
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
export function logTime(s: string | null) {
  const m = s && /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2}):(\d{2})/.exec(s);
  if (!m) return s ?? '';
  const [, y, mo, d, h, mi, se] = m;
  const hh = +h % 12 || 12;
  return `${d} ${MONTHS[+mo - 1]} ${y}, ${String(hh).padStart(2, '0')}:${mi}:${se} ${+h < 12 ? 'AM' : 'PM'}`;
}
