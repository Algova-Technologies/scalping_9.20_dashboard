// Run: npm test
import assert from 'node:assert/strict';
import { appOf, apps, projectUrl, scalpingFor } from './apps';

assert.equal(appOf('/').id, 'no-delta-multi-variant'); // '/' redirects to it
assert.equal(appOf('/scalping-9-20-no-delta-multi-variant').id, 'no-delta-multi-variant');
assert.equal(appOf('/scalping-9-20-with-delta-multi-variant/projects/BANKNIFTY@x/logs/live').id, 'with-delta-multi-variant');
assert.equal(appOf('/scalping-9-20-no-delta-paper').id, 'no-delta-paper');
assert.equal(appOf('/scalping-9-20-no-delta-paper/users').id, 'no-delta-paper');
assert.equal(appOf('/scalping-9-20-no-delta-live/pnl/weekly').id, 'no-delta-live');
assert.equal(appOf('/scalping-9-20-with-delta-paper/users/1/edit').id, 'with-delta-paper');
assert.equal(appOf('/scalping-9-20-with-delta-live/logs/account').id, 'with-delta-live');
assert.equal(appOf('/scalping-9-20-no-delta-paper-x').id, 'no-delta-multi-variant'); // prefix of a segment is not a match

// Each multi variant database (live and dry run) belongs to its family's app; project links follow it.
assert.equal(scalpingFor('scalping_9.20_no_delta_multi_variant_live').id, 'no-delta-multi-variant');
assert.equal(scalpingFor('scalping_9.20_no_delta_multi_variant_dryrun').id, 'no-delta-multi-variant');
assert.equal(scalpingFor('scalping_9.20_with_delta_multi_variant_live').id, 'with-delta-multi-variant');
assert.equal(scalpingFor('scalping_9.20_with_delta_multi_variant_dryrun').id, 'with-delta-multi-variant');
assert.equal(projectUrl('NIFTY50@scalping_9.20_with_delta_multi_variant_dryrun'), '/scalping-9-20-with-delta-multi-variant/projects/NIFTY50@scalping_9.20_with_delta_multi_variant_dryrun');

// Every root, id, database and backend prefix is distinct, so no two apps share routes, cache keys or data.
for (const k of ['id', 'root', 'db', 'api', 'family'] as const) {
  const vals = apps.map((a) => (a as Record<string, unknown>)[k]).filter(Boolean);
  assert.equal(new Set(vals).size, vals.length, `duplicate ${k}`);
}
assert.deepEqual(apps.map((a) => a.label), ['No Delta Multi Variant', 'With Delta Multi Variant', 'No Delta Paper', 'No Delta Live', 'With Delta Paper', 'With Delta Live']);

console.log('apps ok');
