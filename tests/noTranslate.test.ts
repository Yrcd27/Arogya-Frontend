import { test } from 'node:test';
import assert from 'node:assert/strict';
import { noTranslateClass, noTranslateProps } from '../src/utils/noTranslate';
import { displayNameParts, initials, value } from '../src/utils/staffProfile';
import type { DoctorProfile } from '../src/types/user';

test('noTranslateClass appends the notranslate token once', () => {
  assert.equal(noTranslateClass(), 'notranslate');
  assert.equal(noTranslateClass('font-medium'), 'font-medium notranslate');
});

test('noTranslateProps protects only when active', () => {
  assert.deepEqual(noTranslateProps('a'), { translate: 'no', className: 'a notranslate' });
  assert.deepEqual(noTranslateProps('a', false), { className: 'a' });
});

test('initials come from the name without the title and survive non-latin names', () => {
  assert.equal(initials('Dr. Chamara Kumara'), 'CK');
  assert.equal(initials('  '), '?');
  assert.equal(initials('සුනිල් පෙරේරා'), 'සප');
});

test('doctor names keep the translatable prefix separate from the protected name', () => {
  const profile = { firstName: 'Fathima', lastName: 'Rizwana' } as DoctorProfile;
  assert.deepEqual(displayNameParts(profile, 'doctor'), { prefix: 'Dr. ', name: 'Fathima Rizwana' });
  assert.deepEqual(displayNameParts(profile, 'technician'), { prefix: '', name: 'Fathima Rizwana' });
});

test('missing values fall back to a translatable placeholder', () => {
  assert.equal(value(''), 'Not provided');
  assert.equal(value(null), 'Not provided');
  assert.equal(value(0), '0');
});
