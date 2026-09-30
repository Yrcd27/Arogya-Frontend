// Shared HTTP client for all backend calls. Every request goes through the
// API Gateway (port 8090 in dev, via the Vite proxy; same origin in a
// production build unless VITE_API_BASE_URL overrides it).

export type ApiOptions = Omit<RequestInit, 'body'> & {
  body?: BodyInit | object | null;
  /** Skip attaching the Authorization header (only needed for login/register). */
  skipAuth?: boolean;
};

export class ApiError extends Error {
  status: number;
  errors?: Record<string, string>;

  constructor(status: number, message: string, errors?: Record<string, string>) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.errors = errors;
  }
}

const isDevelopment = import.meta.env.DEV;
const envBase = (import.meta.env as { VITE_API_BASE_URL?: string }).VITE_API_BASE_URL;
export const API_BASE_URL = isDevelopment ? '' : envBase && envBase.length > 0 ? envBase : 'http://localhost:8090';

/** Dispatched on window when a request comes back 401/403 so the app can log the user out. */
export const AUTH_EXPIRED_EVENT = 'auth:expired';

const AUTH_TOKEN_KEY = 'authToken';

function isFormData(body: unknown): body is FormData {
  return typeof FormData !== 'undefined' && body instanceof FormData;
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function readErrorMessage(response: Response): Promise<{ message: string; errors?: Record<string, string> }> {
  let text = '';
  try {
    text = await response.text();
  } catch {
    // ignore — fall through to the generic message below
  }
  if (!text) {
    return { message: `Request failed with status ${response.status}` };
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
      return { message, errors: fieldErrors };
    }
  } catch {
    // not JSON — use the raw text
  }
  return { message: text };
}

function buildHeaders(body: ApiOptions['body'], skipAuth: boolean | undefined, callerHeaders: HeadersInit | undefined): Record<string, string> {
  const headers: Record<string, string> = {};
  if (!isFormData(body)) {
    headers['Content-Type'] = 'application/json';
  }
  if (!skipAuth) {
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    if (token) headers['Authorization'] = `Bearer ${token}`;
  }
  if (callerHeaders) {
    Object.assign(headers, callerHeaders as Record<string, string>);
  }
  return headers;
}

function serializeBody(body: ApiOptions['body']): BodyInit | undefined {
  if (body === undefined || body === null) return undefined;
  if (isFormData(body) || typeof body === 'string') return body as BodyInit;
  return JSON.stringify(body);
}

/**
 * Core request helper. Attaches the bearer token, serializes plain-object
 * bodies to JSON (leaves FormData alone), retries once or twice on 429
 * (the gateway rate-limits at 2 req/s, burst 4), and throws a typed
 * ApiError with the backend's message on any non-2xx response.
 */
export async function apiFetch<T = unknown>(path: string, options: ApiOptions = {}, attempt = 0): Promise<T> {
  const { skipAuth, headers, body, ...rest } = options;

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...rest,
      headers: buildHeaders(body, skipAuth, headers),
      body: serializeBody(body),
    });
  } catch {
    throw new ApiError(0, 'Unable to reach the server. Please check your connection and that the backend is running.');
  }

  if (response.status === 429 && attempt < 2) {
    await sleep(400 * (attempt + 1));
    return apiFetch<T>(path, options, attempt + 1);
  }

  if ((response.status === 401 || response.status === 403) && !skipAuth) {
    window.dispatchEvent(new CustomEvent(AUTH_EXPIRED_EVENT));
  }

  if (!response.ok) {
    const { message, errors } = await readErrorMessage(response);
    throw new ApiError(response.status, message, errors);
  }

  if (response.status === 204) return null as T;

  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) return null as T;

  const text = await response.text();
  if (!text) return null as T;
  return JSON.parse(text) as T;
}

/** For file downloads: returns the raw blob plus the server-suggested filename. */
export async function apiFetchBlob(path: string, filenameFallback: string): Promise<{ blob: Blob; filename: string }> {
  const token = localStorage.getItem(AUTH_TOKEN_KEY);
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    });
  } catch {
    throw new ApiError(0, 'Unable to reach the server.');
  }
  if (response.status === 401 || response.status === 403) {
    window.dispatchEvent(new CustomEvent(AUTH_EXPIRED_EVENT));
  }
  if (!response.ok) {
    const { message } = await readErrorMessage(response);
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

/** Builds a query string from a params object, skipping null/undefined values. */
export function toQueryString(params: Record<string, unknown> = {}): string {
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') qs.append(key, String(value));
  });
  const str = qs.toString();
  return str ? `?${str}` : '';
}

// --- Small lookup cache -----------------------------------------------
// A handful of pages look up the same user/doctor/clinic by id once per
// row (e.g. a consultation list with many rows from the same doctor).
// This dedupes identical concurrent/soon-after GETs by path so we don't
// refire the same request over and over, which also helps stay under the
// gateway's rate limit.
const lookupCache = new Map<string, Promise<unknown>>();

export function cachedGet<T>(path: string): Promise<T> {
  const existing = lookupCache.get(path);
  if (existing) return existing as Promise<T>;
  const promise = apiFetch<T>(path).catch(err => {
    lookupCache.delete(path);
    throw err;
  });
  lookupCache.set(path, promise);
  return promise as Promise<T>;
}

export function clearLookupCache(): void {
  lookupCache.clear();
}
