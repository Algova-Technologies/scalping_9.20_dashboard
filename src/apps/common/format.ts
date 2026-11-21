// Formatters and request helpers shared by the strategy apps (src/apps/*). Pure: no React.
// Tested by apps.test.ts.

export const json = (method: string, body?: unknown): RequestInit => ({ method, body: body === undefined ? undefined : JSON.stringify(body) });

/** Today in IST as YYYY-MM-DD (the engines' clock). */
export const todayIst = () => new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });

export const inr = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format;
export const signedPct = (n: number) => `${n >= 0 ? '+' : ''}${n.toFixed(2)}%`;
export const tone = (n: number) => (n > 0 ? 'text-emerald-600' : n < 0 ? 'text-red-600' : 'text-zinc-500');
// "2026-11-17" → "17 Nov 2026"
export const dayLabel = (d: string) => new Date(`${d}T00:00`).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
// "2026-11-17T09:20:02.288" (IST wall clock) → "09:20:02 AM"
export const clock = (s: string | null) => {
  const m = s && /T(\d{2}):(\d{2}):(\d{2})/.exec(s);
  return m ? `${String(+m[1] % 12 || 12).padStart(2, '0')}:${m[2]}:${m[3]} ${+m[1] < 12 ? 'AM' : 'PM'}` : '—';
};
// "00:05:43" → "5 min 43 sec"; "00:00:00" or junk → "0 sec" (the paper app's duration style)
export const humanDuration = (hms: string | null | undefined) => {
  const m = /^(\d+):(\d{1,2}):(\d{1,2})$/.exec((hms ?? '').trim());
  if (!m || +m[2] > 59 || +m[3] > 59) return '0 sec';
  const parts = [[+m[1], 'hr'], [+m[2], 'min'], [+m[3], 'sec']].filter(([n]) => n).map(([n, u]) => `${n} ${u}`);
  return parts.join(' ') || '0 sec';
};
// Seconds → "HH:MM:SS"
export const hms = (s: number) => {
  const t = Math.max(0, Math.floor(s));
  return [Math.floor(t / 3600), Math.floor((t % 3600) / 60), t % 60].map((n) => String(n).padStart(2, '0')).join(':');
};
