import { createContext } from 'react';

export type UnsavedChangesContextValue = {
  registerGuard: (id: symbol, active: boolean) => void;
  requestDiscard: (action: () => void) => void;
};

export const UnsavedChangesContext = createContext<UnsavedChangesContextValue | null>(null);
