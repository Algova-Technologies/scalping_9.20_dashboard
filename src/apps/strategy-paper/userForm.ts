// With Delta user form logic (no React), tested by userForm.test.ts. Paper and live alike.
// Same rules as the old paper app and its backend (apps/strategy_paper/api.py: UserIn, _save).

export const SECRETS = ['password', 'api_key', 'qr_totp_token'] as const;
export type UserForm = {
  first_name: string; last_name: string; email: string; mobile: string;
  trade_role: 'master' | 'user'; broker: string; client_id: string;
  password: string; api_key: string; qr_totp_token: string; buying_power: string;
  account_status: number; broker_connection_status: number; trade_status: number;
};
export const blankForm: UserForm = {
  first_name: '', last_name: '', email: '', mobile: '', trade_role: 'user', broker: 'angel', client_id: '',
  password: '', api_key: '', qr_totp_token: '', buying_power: '',
  account_status: 0, broker_connection_status: 0, trade_status: 1, // new accounts start trading
};

/** Field → message for every invalid field; {} = valid. Editing keeps saved secrets when left blank. */
export function validateUser(f: UserForm, opts: { creating: boolean; masterTaken: boolean; mode?: 'paper' | 'live' }) {
  const e: Partial<Record<keyof UserForm, string>> = {};
  for (const [k, max] of [['first_name', 100], ['last_name', 100], ['email', 150], ['client_id', 100]] as const) {
    if (!f[k].trim()) e[k] = 'This field is required.';
    else if (f[k].trim().length > max) e[k] = `At most ${max} characters.`;
  }
  if (!e.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email.trim())) e.email = 'Enter a valid email address.';
  if (!/^[6-9]\d{9}$/.test(f.mobile)) e.mobile = 'Enter a 10-digit mobile number starting with 6–9.';
  if (f.trade_role === 'master' && opts.masterTaken) e.trade_role = `A ${opts.mode ?? 'paper'} trade master already exists. Only one is allowed.`;
  if (f.broker !== 'angel') e.broker = 'Select a broker.';
  for (const k of SECRETS) {
    if (opts.creating && !f[k].trim()) e[k] = 'This field is required.';
    else if (f[k].length > 255) e[k] = 'At most 255 characters.';
  }
  if (f.buying_power && Number(f.buying_power) !== 0 && Number(f.buying_power) < 15000) e.buying_power = 'Buying Power must be at least 15,000.';
  return e;
}

/** What the API gets: trimmed text, buying power null unless ≥ 15,000, the master always trading. */
export function toPayload(f: UserForm) {
  const t = (s: string) => s.trim();
  return {
    ...f,
    first_name: t(f.first_name), last_name: t(f.last_name), email: t(f.email), client_id: t(f.client_id),
    password: t(f.password), api_key: t(f.api_key), qr_totp_token: t(f.qr_totp_token),
    buying_power: Number(f.buying_power) >= 15000 ? String(Number(f.buying_power)) : null,
    trade_status: f.trade_role === 'master' ? 1 : f.trade_status,
  };
}
