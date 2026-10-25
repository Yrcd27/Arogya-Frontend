import { beforeEach, test } from 'node:test';
import assert from 'node:assert/strict';
import { installBrowserGlobals } from './helpers';
import { clearStoredClinicId, clearStoredClinicSelections, getStoredClinicId, storeClinicId } from '../src/utils/doctorClinicSelection';
import { operationalClinics } from '../src/utils/dashboard';
import { businessDateString } from '../src/utils/businessDate';
import { getAvailableClinics, sortClinics } from '../src/utils/clinic';
import type { Clinic } from '../src/types/clinic';

const env = installBrowserGlobals();
const DAY = '2026-10-24';

beforeEach(() => env.storage.clear());

test('selection persists for the same doctor on the same business day (reload)', () => {
  storeClinicId(78, 57, DAY);
  assert.equal(getStoredClinicId(78, DAY), 57);
  assert.equal(getStoredClinicId(78, DAY), 57);
});

test('user switching: another doctor never receives the saved clinic', () => {
  storeClinicId(78, 57, DAY);
  assert.equal(getStoredClinicId(79, DAY), null);
  env.storage.setItem('doctor:selectedClinic:79', JSON.stringify({ doctorId: 78, clinicId: 57, day: DAY }));
  assert.equal(getStoredClinicId(79, DAY), null);
});

test('selection expires when the Asia/Colombo business day changes', () => {
  const beforeMidnight = new Date('2026-10-24T18:29:59Z');
  const afterMidnight = new Date('2026-10-24T18:30:00Z');
  storeClinicId(78, 57, businessDateString(beforeMidnight));
  assert.equal(getStoredClinicId(78, businessDateString(beforeMidnight)), 57);
  assert.equal(getStoredClinicId(78, businessDateString(afterMidnight)), null);
  assert.equal(env.storage.getItem('doctor:selectedClinic:78'), null);
});

test('malformed, foreign or invalid entries are rejected and removed', () => {
  env.storage.setItem('doctor:selectedClinic:5', '{not json');
  assert.equal(getStoredClinicId(5, DAY), null);
  env.storage.setItem('doctor:selectedClinic:5', JSON.stringify({ doctorId: 5, clinicId: -3, day: DAY }));
  assert.equal(getStoredClinicId(5, DAY), null);
  env.storage.setItem('doctor:selectedClinic:5', JSON.stringify({ doctorId: 5, clinicId: '9; drop', day: DAY }));
  assert.equal(getStoredClinicId(5, DAY), null);
  assert.equal(getStoredClinicId(undefined, DAY), null);
});

test('logout cleanup removes only the signed-in doctor selection', () => {
  storeClinicId(78, 57, DAY);
  storeClinicId(79, 58, DAY);
  env.storage.setItem('arogya-language', 'si');
  env.storage.setItem('authToken', 'x.y.z');
  clearStoredClinicSelections(78);
  assert.equal(env.storage.getItem('doctor:selectedClinic:78'), null);
  assert.equal(getStoredClinicId(79, DAY), 58);
  assert.equal(env.storage.getItem('arogya-language'), 'si');
  assert.equal(env.storage.getItem('authToken'), 'x.y.z');
});

test('logout cleanup with an unknown user sweeps only clinic selection keys', () => {
  storeClinicId(78, 57, DAY);
  storeClinicId(79, 58, DAY);
  env.storage.setItem('arogya-language', 'si');
  clearStoredClinicSelections();
  assert.equal(env.storage.getItem('doctor:selectedClinic:78'), null);
  assert.equal(env.storage.getItem('doctor:selectedClinic:79'), null);
  assert.equal(env.storage.getItem('arogya-language'), 'si');
});

test('explicit clear and overwrite behave as expected', () => {
  storeClinicId(78, 57, DAY);
  storeClinicId(78, 58, DAY);
  assert.equal(getStoredClinicId(78, DAY), 58);
  clearStoredClinicId(78);
  assert.equal(getStoredClinicId(78, DAY), null);
});

const clinic = (id: number, status: Clinic['status'], scheduledDate: string): Clinic => ({
  id, clinicName: `Clinic ${id}`, province: 'Western', district: 'Gampaha District', scheduledDate, scheduledTime: '08:00:00', status,
});

test('restored selections are only eligible when the clinic is operational on the Colombo date', () => {
  const clinics = [
    clinic(1, 'IN_PROGRESS', '2026-10-20'),
    clinic(2, 'SCHEDULED', '2026-10-24'),
    clinic(3, 'SCHEDULED', '2026-10-23'),
    clinic(4, 'COMPLETED', '2026-10-24'),
    clinic(5, 'CANCELLED', '2026-10-30'),
    clinic(6, 'SCHEDULED', '2026-10-25'),
  ];
  const ids = (today: string) => operationalClinics(clinics, today).map(item => item.id).sort();
  assert.deepEqual(ids('2026-10-24'), [1, 2, 6]);
  assert.deepEqual(ids('2026-10-25'), [1, 6]);
  assert.deepEqual(ids('2026-10-26'), [1]);
});

test('patients can join in-progress and upcoming clinics, but not completed, cancelled or past ones', () => {
  const clinics = [
    clinic(1, 'IN_PROGRESS', '2026-10-24'),
    clinic(2, 'SCHEDULED', '2026-10-24'),
    clinic(3, 'SCHEDULED', '2026-10-30'),
    clinic(4, 'COMPLETED', '2026-10-24'),
    clinic(5, 'CANCELLED', '2026-10-30'),
    clinic(6, 'SCHEDULED', '2020-01-01'),
  ];
  const original = Date;
  const fixed = new original('2026-10-24T05:00:00Z');
  globalThis.Date = class extends original { constructor(...args: ConstructorParameters<typeof Date>) { super(...(args.length ? args : [fixed.getTime()] as unknown as ConstructorParameters<typeof Date>)); } } as DateConstructor;
  try {
    assert.deepEqual(getAvailableClinics(clinics).map(item => item.id), [1, 2, 3]);
  } finally {
    globalThis.Date = original;
  }
});

test('recent sort lists the most recently added clinic (highest id) first without mutating the input', () => {
  const clinics = [clinic(3, 'SCHEDULED', '2026-11-01'), clinic(12, 'SCHEDULED', '2026-12-01'), clinic(7, 'IN_PROGRESS', '2026-10-24')];
  assert.deepEqual(sortClinics(clinics, 'recent').map(item => item.id), [12, 7, 3]);
  assert.deepEqual(clinics.map(item => item.id), [3, 12, 7]);
});
