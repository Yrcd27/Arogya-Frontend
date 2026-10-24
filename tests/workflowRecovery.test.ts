import { beforeEach, test } from 'node:test';
import assert from 'node:assert/strict';
import { installBrowserGlobals } from './helpers';
import { findConsultationForToken, isLabOrderSaved, progressForStatus } from '../src/utils/consultationRecovery';
import { clearStoredServingTokenId, getStoredServingTokenId, setStoredServingTokenId } from '../src/utils/servingTokenStorage';
import type { Consultation } from '../src/services/consultationService';

const env = installBrowserGlobals();
const session = new Map<string, string>();
Object.assign(globalThis, {
  sessionStorage: {
    getItem: (key: string) => session.get(key) ?? null,
    setItem: (key: string, value: string) => { session.set(key, value); },
    removeItem: (key: string) => { session.delete(key); },
  },
});

beforeEach(() => {
  env.storage.clear();
  session.clear();
});

const consultation = (over: Partial<Consultation>): Consultation => ({
  id: 1, patientId: 118, doctorId: 78, clinicId: 57, queueTokenId: 96, chiefComplaint: 'Fever', status: 'SCHEDULED', ...over,
});
const match = { tokenId: 96, patientId: 118, doctorId: 78, clinicId: 57 };

test('an earlier consultation for the same token is found instead of creating a duplicate', () => {
  const found = findConsultationForToken([consultation({ id: 10 }), consultation({ id: 12, status: 'IN_PROGRESS' })], match);
  assert.equal(found?.id, 12);
});

test('consultations for other tokens, patients, doctors or clinics are ignored', () => {
  const others = [
    consultation({ id: 1, queueTokenId: 97 }),
    consultation({ id: 2, patientId: 119 }),
    consultation({ id: 3, doctorId: 79 }),
    consultation({ id: 4, clinicId: 58 }),
    consultation({ id: 5, queueTokenId: undefined }),
  ];
  assert.equal(findConsultationForToken(others, match), null);
});

test('a cancelled consultation does not block creating a new one', () => {
  assert.equal(findConsultationForToken([consultation({ id: 7, status: 'CANCELLED' })], match), null);
  assert.equal(findConsultationForToken([consultation({ id: 7, status: 'CANCELLED' }), consultation({ id: 8, status: 'COMPLETED' })], match)?.id, 8);
});

test('progress is derived from the real backend status, not assumed', () => {
  assert.deepEqual(progressForStatus('SCHEDULED'), { started: false, completed: false });
  assert.deepEqual(progressForStatus('IN_PROGRESS'), { started: true, completed: false });
  assert.deepEqual(progressForStatus('COMPLETED'), { started: true, completed: true });
});

test('lab order verification handles missing, present and duplicate test names', () => {
  const orders = [{ testName: 'Full Blood Count' }, { testName: ' full blood count ' }, { testName: 'ECG' }];
  assert.equal(isLabOrderSaved([], orders, 0), false);
  assert.equal(isLabOrderSaved([{ testName: 'Full Blood Count' }], orders, 0), true);
  assert.equal(isLabOrderSaved([{ testName: 'Full Blood Count' }], orders, 1), false);
  assert.equal(isLabOrderSaved([{ testName: 'Full Blood Count' }, { testName: 'FULL BLOOD COUNT' }], orders, 1), true);
  assert.equal(isLabOrderSaved([{ testName: 'Full Blood Count' }], orders, 2), false);
  assert.equal(isLabOrderSaved([], [{ testName: '  ' }], 0), false);
});

test('the serving token survives a new tab or browser restart (localStorage, token id only)', () => {
  setStoredServingTokenId(78, 57, 96);
  session.clear();
  assert.equal(getStoredServingTokenId(78, 57), 96);
  assert.deepEqual(Object.keys(env.storage), ['doctorQueue:servingTokenId:78:57']);
  assert.equal(env.storage.getItem('doctorQueue:servingTokenId:78:57'), '96');
});

test('serving tokens are isolated per doctor and per clinic', () => {
  setStoredServingTokenId(78, 57, 96);
  assert.equal(getStoredServingTokenId(79, 57), null);
  assert.equal(getStoredServingTokenId(78, 58), null);
});

test('a legacy sessionStorage serving token is migrated, and invalid values are cleared', () => {
  session.set('doctorQueue:servingTokenId:78:57', '96');
  assert.equal(getStoredServingTokenId(78, 57), 96);
  assert.equal(env.storage.getItem('doctorQueue:servingTokenId:78:57'), '96');
  env.storage.setItem('doctorQueue:servingTokenId:78:57', 'abc');
  assert.equal(getStoredServingTokenId(78, 57), null);
  assert.equal(env.storage.getItem('doctorQueue:servingTokenId:78:57'), null);
});

test('clearing removes the serving token from both storages', () => {
  setStoredServingTokenId(78, 57, 96);
  session.set('doctorQueue:servingTokenId:78:57', '96');
  clearStoredServingTokenId(78, 57);
  assert.equal(getStoredServingTokenId(78, 57), null);
  assert.equal(session.size, 0);
});
