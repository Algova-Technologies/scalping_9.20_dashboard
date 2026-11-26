import assert from 'node:assert/strict';
import { appOf, apps, projectUrl, scalpingFor } from './apps';

assert.equal(appOf('/').id, 'no-delta-multi-variant'); // '/' redirects to it
assert.equal(appOf('/scalping-9-20-no-delta-multi-variant').id, 'no-delta-multi-variant');
assert.equal(appOf('/scalping-9-20-with-delta-multi-variant/projects/BANKNIFTY@x/logs/live').id, 'with-delta-multi-variant');
assert.equal(appOf('/scalping-9-20-no-delta-paper').id, 'no-delta-paper');
assert.equal(appOf('/scalping-9-20-no-delta-paper/broker').id, 'no-delta-paper');
assert.equal(appOf('/scalping-9-20-no-delta-live/projects/default@scalping_9.20_no_delta_live').id, 'no-delta-live');
assert.equal(appOf('/scalping-9-20-with-delta-paper/projects/default@x/users/1/edit').id, 'with-delta-paper');
assert.equal(appOf('/scalping-9-20-with-delta-live').id, 'with-delta-live');
assert.equal(appOf('/scalping-9-20-no-delta-paper-x').id, 'no-delta-multi-variant'); // prefix of a segment is not a match

// Each Go project's database and its dry-run copy belong to its app, matched exactly: scalping_9.20_no_delta_paper
// is a substring of scalping_9.20_multi_variant_no_delta_paper, and must not be taken for it.
assert.equal(scalpingFor('scalping_9.20_multi_variant_no_delta_paper').id, 'no-delta-multi-variant');
assert.equal(scalpingFor('BANKNIFTY@scalping_9.20_multi_variant_no_delta_paper_dryrun').id, 'no-delta-multi-variant');
assert.equal(scalpingFor('scalping_9.20_multi_variant_with_delta_paper_dryrun').id, 'with-delta-multi-variant');
assert.equal(scalpingFor('default@scalping_9.20_no_delta_paper').id, 'no-delta-paper');
assert.equal(scalpingFor('default@scalping_9.20_no_delta_live_dryrun').id, 'no-delta-live');
assert.equal(scalpingFor('default@scalping_9.20_with_delta_paper').id, 'with-delta-paper');
assert.equal(scalpingFor('scalping_9.20_with_delta_live_dryrun').id, 'with-delta-live');
assert.equal(projectUrl('default@scalping_9.20_with_delta_live'), '/scalping-9-20-with-delta-live/projects/default@scalping_9.20_with_delta_live');
assert.equal(projectUrl('NIFTY50@scalping_9.20_multi_variant_with_delta_paper_dryrun'), '/scalping-9-20-with-delta-multi-variant/projects/NIFTY50@scalping_9.20_multi_variant_with_delta_paper_dryrun');

// Every root, id, database and backend engine is distinct, so no two apps share routes, cache keys or data.
for (const k of ['id', 'root', 'db', 'engine'] as const) assert.equal(new Set(apps.map((a) => a[k])).size, apps.length, `duplicate ${k}`);
assert.deepEqual(apps.map((a) => a.label), ['No Delta Multi Variant', 'With Delta Multi Variant', 'No Delta Paper', 'No Delta Live', 'With Delta Paper', 'With Delta Live']);
assert.deepEqual(apps.filter((a) => a.broker).map((a) => a.id), ['no-delta-paper', 'no-delta-live']); // the broker portal stays where it was

console.log('apps ok');
