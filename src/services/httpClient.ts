export type ApiOptions = Omit<RequestInit, 'body'> & {
  body?: BodyInit | object | null;
  skipAuth?: boolean;
  timeoutMs?: number;
  signal?: AbortSignal;
};

export class ApiError extends Error {
  status: number;
  errors?: Record<string, string>;
  aborted?: boolean;

  constructor(status: number, message: string, errors?: Record<string, string>, aborted?: boolean) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.errors = errors;
    this.aborted = aborted;
  }
}

const isDevelopment = import.meta.env.DEV;
const envBase = (import.meta.env as { VITE_API_BASE_URL?: string }).VITE_API_BASE_URL;

export const API_BASE_URL = isDevelopment ? '' : envBase && envBase.length > 0 ? envBase : '';

if (!isDevelopment && !(envBase && envBase.length > 0)) {
  console.warn(
    '[httpClient] VITE_API_BASE_URL is not set in this production build; falling back to same-origin requests.'
  );
}

export const AUTH_EXPIRED_EVENT = 'auth:expired';

const AUTH_TOKEN_KEY = 'authToken';
const DEFAULT_TIMEOUT_MS = 15000;
const SAFE_RETRY_METHODS = new Set(['GET', 'HEAD']);

function isFormData(body: unknown): body is FormData {
  return typeof FormData !== 'undefined' && body instanceof FormData;
}

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new ApiError(0, 'Request cancelled.', undefined, true));
      return;
    }
    const timeoutId = window.setTimeout(() => {
      signal?.removeEventListener('abort', onAbort);
      resolve();
    }, ms);
    const onAbort = () => {
      window.clearTimeout(timeoutId);
      reject(new ApiError(0, 'Request cancelled.', undefined, true));
    };
    signal?.addEventListener('abort', onAbort, { once: true });
  });
}

async function readErrorMessage(response: Response): Promise<{ message: string; errors?: Record<string, string>; bodyEmpty: boolean }> {
  const text = await response.text().catch(() => '');
  if (!text) {
    return { message: `Request failed with status ${response.status}`, bodyEmpty: true };
  }
  try {
    const json = JSON.parse(text);
    if (json && typeof json === 'object') {
      const messageFromErrors =
        Array.isArray(json.errors) && json.errors.length > 0
          ? json.errors.map((e: { defaultMessage?: string; message?: string }) => e?.defaultMessage || e?.message).filter(Boolean).join(', ')
          : undefined;
      const message: string = json.message || json.error || messageFromErrors || text;
      const fieldErrors: Record<string, string> | undefined =
        json.errors && !Array.isArray(json.errors) ? json.errors : undefined;
      return { message, errors: fieldErrors, bodyEmpty: false };
    }
  } catch {
    return { message: text.length > 300 ? `${text.slice(0, 300)}…` : text, bodyEmpty: false };
  }
  return { message: text, bodyEmpty: false };
}

function buildHeaders(body: ApiOptions['body'], skipAuth: boolean | undefined, callerHeaders: HeadersInit | undefined): Headers {
  const headers = new Headers();
  if (!isFormData(body)) {
    headers.set('Content-Type', 'application/json');
  }
  if (!skipAuth) {
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    if (token) headers.set('Authorization', `Bearer ${token}`);
  }
  if (callerHeaders) {
    new Headers(callerHeaders).forEach((value, key) => headers.set(key, value));
  }
  return headers;
}

function serializeBody(body: ApiOptions['body']): BodyInit | undefined {
  if (body === undefined || body === null) return undefined;
  if (isFormData(body) || typeof body === 'string') return body as BodyInit;
  return JSON.stringify(body);
}

function isMutatingMethod(method: string | undefined): boolean {
  return !SAFE_RETRY_METHODS.has((method || 'GET').toUpperCase());
}

export async function apiFetch<T = unknown>(path: string, options: ApiOptions = {}, attempt = 0): Promise<T> {
  const { skipAuth, headers, body, timeoutMs = DEFAULT_TIMEOUT_MS, signal: callerSignal, ...rest } = options;

  const controller = new AbortController();
  const onCallerAbort = () => controller.abort();
  if (callerSignal) {
    if (callerSignal.aborted) controller.abort();
    else callerSignal.addEventListener('abort', onCallerAbort);
  }
  const timeoutId = timeoutMs > 0 ? window.setTimeout(() => controller.abort(), timeoutMs) : undefined;

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...rest,
      headers: buildHeaders(body, skipAuth, headers),
      body: serializeBody(body),
      signal: controller.signal,
    });
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      const callerCancelled = !!callerSignal?.aborted;
      throw new ApiError(0, callerCancelled ? 'Request cancelled.' : 'Request timed out. Please try again.', undefined, true);
    }
    throw new ApiError(0, 'Unable to reach the server. Please check your connection and that the backend is running.');
  } finally {
    if (timeoutId) window.clearTimeout(timeoutId);
    if (callerSignal) callerSignal.removeEventListener('abort', onCallerAbort);
  }

  if (response.status === 429 && attempt < 2 && !isMutatingMethod(rest.method)) {
    await sleep(400 * (attempt + 1), callerSignal);
    return apiFetch<T>(path, options, attempt + 1);
  }

  if (!response.ok) {
    const { message, errors } = await readErrorMessage(response);

    if (response.status === 401 && !skipAuth) {
      window.dispatchEvent(new CustomEvent(AUTH_EXPIRED_EVENT));
    }

    throw new ApiError(response.status, message, errors);
  }

  if (response.status === 204) return null as T;

  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    if (contentType.includes('text/html')) {
      throw new ApiError(response.status, 'Unexpected HTML response from the server (check API routing/configuration).');
    }
    return null as T;
  }

  const text = await response.text();
  if (!text) return null as T;
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new ApiError(response.status, 'The server returned malformed JSON.');
  }
}

export async function apiFetchBlob(path: string, filenameFallback: string, options: { signal?: AbortSignal; timeoutMs?: number } = {}): Promise<{ blob: Blob; filename: string }> {
  const token = localStorage.getItem(AUTH_TOKEN_KEY);
  const controller = new AbortController();
  const onCallerAbort = () => controller.abort();
  if (options.signal) {
    if (options.signal.aborted) controller.abort();
    else options.signal.addEventListener('abort', onCallerAbort);
  }
  const timeoutMs = options.timeoutMs ?? 30000;
  const timeoutId = timeoutMs > 0 ? window.setTimeout(() => controller.abort(), timeoutMs) : undefined;

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      signal: controller.signal,
    });
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw new ApiError(0, options.signal?.aborted ? 'Download cancelled.' : 'Download timed out.', undefined, true);
    }
    throw new ApiError(0, 'Unable to reach the server.');
  } finally {
    if (timeoutId) window.clearTimeout(timeoutId);
    if (options.signal) options.signal.removeEventListener('abort', onCallerAbort);
  }

  if (!response.ok) {
    const { message } = await readErrorMessage(response);
    if (response.status === 401) {
      window.dispatchEvent(new CustomEvent(AUTH_EXPIRED_EVENT));
    }
    throw new ApiError(response.status, message);
  }
  const blob = await response.blob();
  let filename = filenameFallback;
  const contentDisposition = response.headers.get('Content-Disposition');
  if (contentDisposition) {
    const quoted = contentDisposition.match(/filename="([^"]+)"/);
    const unquoted = contentDisposition.match(/filename=([^;\s]+)/);
    filename = quoted?.[1] || unquoted?.[1] || filename;
  }
  return { blob, filename };
}

export function toQueryString(params: Record<string, unknown> = {}): string {
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') qs.append(key, String(value));
  });
  const str = qs.toString();
  return str ? `?${str}` : '';
}
