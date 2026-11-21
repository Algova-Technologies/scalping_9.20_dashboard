// Run: npm test
import assert from 'node:assert/strict';
import { blank, pickUser, validate, type Form } from './userForm';

const ok: Form = {
  ...blank,
  first_name: 'Asha', last_name: 'Rao', email: 'asha@example.com', mobile: '9876543210',
  client_id: 'C1', password: 'pw', api_key: 'k', qr_totp_token: 'JBSWY3DPEHPK3PXP',
};
assert.deepEqual(validate(ok, false), {});
assert.deepEqual(Object.keys(validate(blank, false)).sort(),
  ['api_key', 'client_id', 'email', 'first_name', 'last_name', 'mobile', 'password', 'qr_totp_token'].sort());
assert.ok(validate({ ...ok, email: 'a@b' }, false).email);
assert.ok(validate({ ...ok, mobile: '5876543210' }, false).mobile);
assert.ok(validate({ ...ok, mobile: '987654321' }, false).mobile);
assert.ok(validate({ ...ok, role: 'admin' }, true).role);
assert.deepEqual(validate({ ...ok, role: 'admin' }, false), {});
assert.ok(validate({ ...ok, qr_totp_token: 'abc-189' }, false).qr_totp_token);
assert.ok(validate({ ...ok, buying_power: '14999' }, false).buying_power);
assert.deepEqual(validate({ ...ok, buying_power: '15000' }, false), {});
assert.ok(validate({ ...ok, buying_power: '9'.repeat(80) }, false).buying_power); // column is varchar(50)
const people = [{ user_id: 4, role: 'user' }, { user_id: 7, role: 'Admin' }];
assert.equal(pickUser(undefined, people), 7); // default: admin (case-insensitive)
assert.equal(pickUser(4, people), 4); // this session's choice wins
assert.equal(pickUser(99, people), 7); // choice no longer exists → admin
assert.equal(pickUser(undefined, [{ user_id: 4, role: 'user' }]), 4); // no admin → first user
assert.equal(pickUser(undefined, []), undefined); // no users → no filter
console.log('userForm ok');
