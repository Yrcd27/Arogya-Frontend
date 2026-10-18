import { useCallback, useContext, useEffect, useRef } from 'react';
import { UnsavedChangesContext } from '../context/UnsavedChangesContext';

export function useUnsavedChangesWarning(hasUnsavedChanges: boolean) {
  const context = useContext(UnsavedChangesContext);
  const guardId = useRef(Symbol('unsaved-changes-guard'));

  if (!context) {
    throw new Error('useUnsavedChangesWarning must be used within an UnsavedChangesProvider.');
  }

  const { registerGuard, requestDiscard } = context;

  useEffect(() => {
    registerGuard(guardId.current, hasUnsavedChanges);
  }, [hasUnsavedChanges, registerGuard]);

  useEffect(() => () => registerGuard(guardId.current, false), [registerGuard]);

  useEffect(() => {
    if (!hasUnsavedChanges) return;
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [hasUnsavedChanges]);

  return useCallback((action: () => void) => {
    if (hasUnsavedChanges) requestDiscard(action);
    else action();
  }, [hasUnsavedChanges, requestDiscard]);
}
