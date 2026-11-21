// Pure form logic (no React), so it runs under plain node: see userForm.test.ts.
export const brokers = [{ value: 'angelone', label: 'AngelOne' }];
export const roles = [
  { value: 'user', label: 'User' },
  { value: 'admin', label: 'Admin' },
];

// ---- form ----
export const fields = [
  'first_name', 'last_name', 'email', 'mobile', 'role', 'broker',
  'client_id', 'password', 'api_key', 'qr_totp_token', 'buying_power',
] as const;
export type Form = Record<(typeof fields)[number], string>;
export const blank: Form = Object.fromEntries(fields.map((f) => [f, ''])) as Form;
blank.role = 'user';
blank.broker = 'angelone';

const MIN_BUYING_POWER = 15000;

// Returns field → message for every invalid field; empty object means valid.
// adminTaken: another user already holds the single admin seat.
export function validate(f: Form, adminTaken: boolean) {
  const e: Partial<Record<keyof Form, string>> = {};
  const req = (k: keyof Form, label: string, max: number) => {
    if (!f[k].trim()) e[k] = `${label} is required`;
    else if (f[k].length > max) e[k] = `${label} must be at most ${max} characters`;
  };
  req('first_name', 'First name', 100);
  req('last_name', 'Last name', 100);
  req('email', 'Email', 150);
  if (!e.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email.trim())) e.email = 'Enter a valid email address';
  if (!f.mobile) e.mobile = 'Mobile is required';
  else if (!/^[6-9]\d{9}$/.test(f.mobile)) e.mobile = 'Enter a 10-digit mobile number starting with 6-9';
  if (!roles.some((r) => r.value === f.role)) e.role = 'Select a role';
  else if (f.role === 'admin' && adminTaken) e.role = 'An admin already exists. Only one admin is allowed';
  if (!brokers.some((b) => b.value === f.broker)) e.broker = 'Select a broker';
  req('client_id', 'Client ID', 100);
  req('password', 'Password', 255);
  req('api_key', 'API key', 255);
  req('qr_totp_token', 'TOTP token', 255);
  if (!e.qr_totp_token && !/^[A-Z2-7]+=*$/i.test(f.qr_totp_token.trim()))
    e.qr_totp_token = 'TOTP token must be base32 (letters A-Z and digits 2-7)';
  if (f.buying_power.length > 50) e.buying_power = 'Buying power must be at most 50 characters'; // column is varchar(50)
  else if (f.buying_power && Number(f.buying_power) < MIN_BUYING_POWER)
    e.buying_power = `Buying power must be at least ${MIN_BUYING_POWER.toLocaleString('en-IN')}`;
  return e;
}

// Header user filter: the user picked this session if they still exist, else the admin, else the first user.
export function pickUser(stored: number | undefined, users: { user_id: number; role: string }[]): number | undefined {
  if (stored !== undefined && users.some((u) => u.user_id === stored)) return stored;
  return (users.find((u) => u.role.toLowerCase() === 'admin') ?? users[0])?.user_id;
}
