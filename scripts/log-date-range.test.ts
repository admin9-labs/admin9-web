import assert from 'node:assert/strict';
import test from 'node:test';
import { toDateRange } from '../src/api/system/log';

test('clearing either log date filter omits the date range from the query', () => {
  assert.deepEqual(toDateRange(['2026-01-01', '2026-01-02']), ['2026-01-01', '2026-01-02']);
  assert.equal(toDateRange(undefined), undefined);
  assert.equal(toDateRange([]), undefined);
});
