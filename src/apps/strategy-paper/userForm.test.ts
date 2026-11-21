// Run: npm test
import assert from 'node:assert/strict';
import { blankForm, toPayload, validateUser } from './userForm';
import { humanDuration, hms } from '../common/format';

const good = { ...blankForm, first_name: 'A', last_name: 'B', email: 'a@b.co', mobile: '9876543210', client_id: 'C1', password: 'p', api_key: 'k', qr_totp_token: 't' };
const create = { creating: true, masterTaken: false };

assert.deepEqual(validateUser(good, create), {});
// create needs every secret; edit keeps the saved ones when blank
assert.deepEqual(Object.keys(validateUser({ ...good, password: '', api_key: '', qr_totp_token: '' }, create)).sort(), ['api_key', 'password', 'qr_totp_token']);
assert.deepEqual(validateUser({ ...good, password: '', api_key: '', qr_totp_token: '' }, { creating: false, masterTaken: false }), {});
assert.ok(validateUser({ ...good, mobile: '5876543210' }, create).mobile);
assert.ok(validateUser({ ...good, email: 'nope' }, create).email);
assert.ok(validateUser({ ...good, trade_role: 'master' }, { creating: true, masterTaken: true }).trade_role);
assert.match(validateUser({ ...good, trade_role: 'master' }, { creating: true, masterTaken: true, mode: 'live' }).trade_role!, /live trade master/);
assert.ok(validateUser({ ...good, buying_power: '14999' }, create).buying_power);
assert.equal(validateUser({ ...good, buying_power: '0' }, create).buying_power, undefined); // 0 = not set
// payload: buying power null unless >= 15000; the master always paper-trades
assert.equal(toPayload({ ...good, buying_power: '0' }).buying_power, null);
assert.equal(toPayload({ ...good, buying_power: '20000' }).buying_power, '20000');
assert.equal(toPayload({ ...good, trade_role: 'master', trade_status: 0 }).trade_status, 1);
assert.equal(toPayload({ ...good, first_name: '  A  ' }).first_name, 'A');

// durations as the paper app shows them
assert.equal(humanDuration('00:05:43'), '5 min 43 sec');
assert.equal(humanDuration('01:00:07'), '1 hr 7 sec');
assert.equal(humanDuration('00:00:00'), '0 sec');
assert.equal(humanDuration('bad'), '0 sec');
assert.equal(hms(3725.9), '01:02:05');
assert.equal(hms(-3), '00:00:00');

console.log('strategy-paper userForm ok');
