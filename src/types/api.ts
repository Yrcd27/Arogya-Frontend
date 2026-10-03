// Spring's standard paginated response shape, returned by consultation-service,
// lab-test and medical-records list endpoints.
export interface Page<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
  first: boolean;
  last: boolean;
}

export function isPage<T>(value: unknown): value is Page<T> {
  return !!value && typeof value === 'object' && Array.isArray((value as Page<T>).content);
}

/** Unwraps a Page<T> or a bare array into a plain array, and totalElements when known. */
export function unwrapList<T>(value: unknown): { items: T[]; total: number } {
  if (isPage<T>(value)) {
    return { items: value.content, total: value.totalElements };
  }
  if (Array.isArray(value)) {
    return { items: value as T[], total: (value as T[]).length };
  }
  return { items: [], total: 0 };
}
