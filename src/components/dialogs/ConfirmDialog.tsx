import { useEffect, useRef, useState, type ReactNode } from 'react';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { BaseModal } from './BaseModal';

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
  confirmLabel?: string;
  cancelLabel?: string;
  confirmClassName?: string;
  loading?: boolean;
  tone?: 'danger' | 'primary';
  icon?: ReactNode;
}

const BUTTON = 'inline-flex min-h-10 min-w-20 items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50';

export function ConfirmDialog({
  isOpen, title, message, onConfirm, onCancel, confirmLabel = 'Confirm', cancelLabel = 'Cancel',
  confirmClassName, loading = false, tone = 'danger', icon,
}: ConfirmDialogProps) {
  const cancelRef = useRef<HTMLButtonElement>(null);
  const inFlight = useRef(false);
  const attemptRef = useRef(0);
  const [submitting, setSubmitting] = useState(false);
  const [actionError, setActionError] = useState('');
  const busy = loading || submitting;

  useEffect(() => {
    if (!isOpen) {
      attemptRef.current += 1;
      inFlight.current = false;
      setSubmitting(false);
      setActionError('');
    }
    return () => { attemptRef.current += 1; };
  }, [isOpen]);

  const cancel = () => {
    if (!loading && !inFlight.current) onCancel();
  };

  const confirm = async () => {
    if (!isOpen || loading || inFlight.current) return;
    const attempt = ++attemptRef.current;
    inFlight.current = true;
    setSubmitting(true);
    setActionError('');
    try {
      await onConfirm();
    } catch (error) {
      if (attempt === attemptRef.current) {
        setActionError(error instanceof Error ? error.message : 'The action could not be confirmed. Check its current state before trying again.');
      }
    } finally {
      if (attempt === attemptRef.current) {
        inFlight.current = false;
        setSubmitting(false);
      }
    }
  };

  return (
    <BaseModal
      isOpen={isOpen}
      title={title}
      description={message}
      role="alertdialog"
      size="sm"
      variant="confirmation"
      busy={busy}
      onClose={cancel}
      initialFocusRef={cancelRef}
      icon={<span className={`flex h-8 w-8 items-center justify-center rounded-full ${tone === 'danger' ? 'bg-red-50 text-red-600' : 'bg-[#38A3A5]/10 text-[#2d8284]'}`}>{icon || <AlertTriangle className="h-5 w-5" />}</span>}
      footer={
        <div className="flex flex-wrap justify-end gap-2">
          <button
            ref={cancelRef}
            type="button"
            onClick={cancel}
            disabled={busy}
            className={`${BUTTON} border border-gray-200 bg-white text-gray-700 hover:bg-gray-100 focus-visible:ring-[#38A3A5]`}
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={() => void confirm()}
            disabled={busy}
            className={`${BUTTON} ${tone === 'danger' ? 'bg-red-600 text-white hover:bg-red-700 focus-visible:ring-red-600' : 'bg-[#38A3A5] text-white hover:bg-[#2d8284] focus-visible:ring-[#38A3A5]'} ${confirmClassName || ''}`}
          >
            {busy && <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin motion-reduce:animate-none" />}
            {confirmLabel}
            {busy && <span className="sr-only"> in progress</span>}
          </button>
        </div>
      }
    >
      {actionError && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{actionError}</p>}
    </BaseModal>
  );
}
