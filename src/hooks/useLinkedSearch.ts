import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

const MAX_LINKED_SEARCH_LENGTH = 100;

export function useLinkedSearch(applySearch: (value: string) => void): void {
  const location = useLocation();

  useEffect(() => {
    const value = new URLSearchParams(location.search).get('search');
    if (value !== null) applySearch(value.slice(0, MAX_LINKED_SEARCH_LENGTH));
  }, [location.key, location.search, applySearch]);
}
