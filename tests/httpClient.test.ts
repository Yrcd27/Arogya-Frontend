import { beforeEach, test } from 'node:test';
import assert from 'node:assert/strict';
import { installBrowserGlobals, mockFetch } from './helpers';
import { AUTH_EXPIRED_EVENT, ApiError, apiFetch } from '../src/services/httpClient';

const env = installBrowserGlobals();
let expiredEvents = 0;
env.window.addEventListener(AUTH_EXPIRED_EVENT, () => { expiredEvents += 1; });

beforeEach(() => {
  env.storage.clear();
  env.storage.setItem('authToken', 'header.payload.signature');
  expiredEvents = 0;
});

const json = (status: number, body: unknown) => new Response(body === null ? null : JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

test('401 on an authenticated request signals session expiry', async () => {
  mockFetch(() => json(401, { message: 'Invalid or expired token' }));
  await assert.rejects(apiFetch('/queue/clinics/57/tokens'), (error: unknown) => error instanceof ApiError && error.status === 401);
  assert.equal(expiredEvents, 1);
});

test('403 does not end the session and gives a friendly message', async () => {
  mockFetch(() => json(403, null));
  await assert.rejects(apiFetch('/queue/clinics/57/tokens'), (error: unknown) => {
    assert.ok(error instanceof ApiError);
    assert.equal(error.status, 403);
    assert.equal(error.message, 'You do not have permission to access this resource.');
    return true;
  });
  assert.equal(expiredEvents, 0);
  assert.equal(env.storage.getItem('authToken'), 'header.payload.signature');
});

test('generic Forbidden bodies are replaced, specific server messages are kept', async () => {
  mockFetch(() => json(403, { error: 'Forbidden' }));
  await assert.rejects(apiFetch('/clinics/getAllClinics'), /do not have permission/);
  mockFetch(() => json(403, { message: 'Only the assigned doctor may update this token.' }));
  await assert.rejects(apiFetch('/clinics/getAllClinics'), /Only the assigned doctor/);
  assert.equal(expiredEvents, 0);
});

test('401 on a skipAuth request does not end an existing session', async () => {
  mockFetch(() => json(401, { message: 'Bad credentials' }));
  await assert.rejects(apiFetch('/users/login', { method: 'POST', skipAuth: true, body: {} }));
  assert.equal(expiredEvents, 0);
});

test('authenticated requests cannot be sent to another origin', async () => {
  const calls = mockFetch(() => json(200, {}));
  await assert.rejects(apiFetch('//evil.example/steal'), /Invalid request path/);
  await assert.rejects(apiFetch('evil.example/steal'), /Invalid request path/);
  assert.equal(calls.length, 0);
});

test('the bearer token is attached to API calls and omitted when skipAuth is set', async () => {
  const calls = mockFetch(() => json(200, {}));
  await apiFetch('/clinics/getAllClinics');
  await apiFetch('http://localhost:8091/chat', { skipAuth: true });
  assert.equal(new Headers(calls[0].init.headers).get('Authorization'), 'Bearer header.payload.signature');
  assert.equal(new Headers(calls[1].init.headers).get('Authorization'), null);
});

test('the local chatbot origin is allowed with auth, other absolute URLs are not', async () => {
  const calls = mockFetch(() => json(200, {}));
  await apiFetch('http://localhost:8091/chat', { method: 'POST', body: {} });
  assert.equal(calls.length, 1);
  await assert.rejects(apiFetch('http://localhost:8091.evil.example/chat'), /Invalid request path/);
  await assert.rejects(apiFetch('https://evil.example/chat'), /Invalid request path/);
  assert.equal(calls.length, 1);
});
