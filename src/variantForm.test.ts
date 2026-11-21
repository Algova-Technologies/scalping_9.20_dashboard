// Run: npm test
import assert from 'node:assert/strict';
import { blankVariant, validateVariant } from './variantForm';

const others = [{ name: '5/5' }, { name: '10/20' }];
assert.deepEqual(validateVariant({ name: '20/40', sl: '20', tp: '40' }, others), {});
assert.deepEqual(Object.keys(validateVariant(blankVariant, others)).sort(), ['name', 'sl', 'tp']);
assert.ok(validateVariant({ name: ' 10/20 ', sl: '1', tp: '1' }, others).name); // duplicate, trimmed
assert.ok(validateVariant({ name: 'x'.repeat(101), sl: '1', tp: '1' }, []).name);
assert.ok(validateVariant({ name: 'a', sl: '0', tp: '1' }, []).sl);
assert.ok(validateVariant({ name: 'a', sl: '1', tp: '1000001' }, []).tp);
assert.ok(validateVariant({ name: 'a', sl: '1.5', tp: '1' }, []).sl);
assert.deepEqual(validateVariant({ name: 'a', sl: '1', tp: '1000000' }, []), {});
console.log('variantForm ok');
