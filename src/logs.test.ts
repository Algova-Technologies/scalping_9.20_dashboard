// Run: npm test
import assert from 'node:assert/strict';
import { logTime, pageWindow } from './logs';

assert.deepEqual(pageWindow(1, 1), [1]);
assert.deepEqual(pageWindow(1, 5), [1, 2, '…', 5]);
assert.deepEqual(pageWindow(3, 5), [1, 2, 3, 4, 5]);
assert.deepEqual(pageWindow(10, 20), [1, '…', 9, 10, 11, '…', 20]);
assert.deepEqual(pageWindow(20, 20), [1, '…', 19, 20]);
assert.deepEqual(pageWindow(4, 7), [1, 2, 3, 4, 5, 6, 7]); // single-page gaps filled, never "…" for one page
assert.deepEqual(pageWindow(1, 0), []);

assert.equal(logTime('2026-11-12T15:20:59.016000'), '12 Nov 2026, 03:20:59 PM');
assert.equal(logTime('2026-11-12T00:05:01'), '12 Nov 2026, 12:05:01 AM');
assert.equal(logTime('2026-01-02 12:00:00'), '02 Jan 2026, 12:00:00 PM');
assert.equal(logTime(null), '');
console.log('logs ok');
