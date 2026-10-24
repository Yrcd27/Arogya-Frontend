import { test } from 'node:test';
import assert from 'node:assert/strict';
import { businessDateString, businessTimeString } from '../src/utils/businessDate';

test('business date follows Asia/Colombo (UTC+5:30), not the host timezone', () => {
  assert.equal(businessDateString(new Date('2026-10-24T18:29:59Z')), '2026-10-24');
  assert.equal(businessDateString(new Date('2026-10-24T18:30:00Z')), '2026-10-25');
  assert.equal(businessTimeString(new Date('2026-10-24T18:29:59Z')), '23:59');
  assert.equal(businessTimeString(new Date('2026-10-24T18:30:00Z')), '00:00');
});

test('business date handles month and year boundaries', () => {
  assert.equal(businessDateString(new Date('2026-12-31T18:30:00Z')), '2027-01-01');
  assert.equal(businessDateString(new Date('2028-02-28T18:30:00Z')), '2028-02-29');
  assert.equal(businessDateString(new Date('2026-12-31T18:29:59Z')), '2026-12-31');
});

test('business date is independent of process timezone', () => {
  const original = process.env.TZ;
  try {
    for (const zone of ['America/Los_Angeles', 'Pacific/Kiritimati', 'UTC']) {
      process.env.TZ = zone;
      assert.equal(businessDateString(new Date('2026-10-24T20:00:00Z')), '2026-10-25');
      assert.equal(businessTimeString(new Date('2026-10-24T20:00:00Z')), '01:30');
    }
  } finally {
    if (original === undefined) delete process.env.TZ;
    else process.env.TZ = original;
  }
});
