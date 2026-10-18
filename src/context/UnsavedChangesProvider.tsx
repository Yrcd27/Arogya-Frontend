import { useCallback, useMemo, useRef, useState, type ReactNode } from 'react';
import { useBlocker } from 'react-router-dom';
import { ConfirmDialog } from '../components/dialogs/ConfirmDialog';
import { UnsavedChangesContext } from './UnsavedChangesContext';

export function UnsavedChangesProvider({ children }: { children: ReactNode }) {
  const guards = useRef(new Set<symbol>());
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [pendingDiscard, setPendingDiscard] = useState<(() => void) | null>(null);

  const registerGuard = useCallback((id: symbol, active: boolean) => {
    if (active) guards.current.add(id);
    else guards.current.delete(id);
    const nextValue = guards.current.size > 0;
    setHasUnsavedChanges(current => current === nextValue ? current : nextValue);
  }, []);

  const blocker = useBlocker(({ currentLocation, nextLocation }) =>
    hasUnsavedChanges && (
      currentLocation.pathname !== nextLocation.pathname
      || currentLocation.search !== nextLocation.search
      || currentLocation.hash !== nextLocation.hash
    )
  );

  const requestDiscard = useCallback((action: () => void) => {
    if (!hasUnsavedChanges) {
      action();
      return;
    }
    setPendingDiscard(current => current ?? action);
  }, [hasUnsavedChanges]);

  const stayOnPage = () => {
    setPendingDiscard(null);
    if (blocker.state === 'blocked') blocker.reset();
  };

  const leaveWithoutSaving = () => {
    if (blocker.state === 'blocked') {
      setPendingDiscard(null);
      blocker.proceed();
      return;
    }
    const action = pendingDiscard;
    setPendingDiscard(null);
    action?.();
  };

  const contextValue = useMemo(
    () => ({ registerGuard, requestDiscard }),
    [registerGuard, requestDiscard]
  );

  return (
    <UnsavedChangesContext.Provider value={contextValue}>
      {children}
      <ConfirmDialog
        isOpen={blocker.state === 'blocked' || pendingDiscard !== null}
        title="Unsaved Changes"
        message="You have unsaved changes. Are you sure you want to leave without saving?"
        cancelLabel="Stay on Page"
        confirmLabel="Leave Without Saving"
        onCancel={stayOnPage}
        onConfirm={leaveWithoutSaving}
      />
    </UnsavedChangesContext.Provider>
  );
}
