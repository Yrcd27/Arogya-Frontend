import { useId, useLayoutEffect, useRef, type ReactNode, type RefObject } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

interface BaseModalProps {
  isOpen: boolean;
  title: ReactNode;
  description?: string;
  icon?: ReactNode;
  children?: ReactNode;
  footer?: ReactNode;
  onClose: () => void;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'standard' | 'confirmation';
  role?: 'dialog' | 'alertdialog';
  busy?: boolean;
  dismissible?: boolean;
  closeOnBackdrop?: boolean;
  initialFocusRef?: RefObject<HTMLElement>;
}

const WIDTHS = { sm: 'max-w-sm', md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-4xl' };
const FOCUSABLE = 'a[href], button, input:not([type="hidden"]), select, textarea, iframe, [tabindex]';
let scrollLocks = 0;
let originalOverflow = '';
let originalPaddingRight = '';

function lockScroll() {
  if (scrollLocks === 0) {
    originalOverflow = document.body.style.overflow;
    originalPaddingRight = document.body.style.paddingRight;
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    if (scrollbarWidth > 0) {
      const padding = Number.parseFloat(window.getComputedStyle(document.body).paddingRight) || 0;
      document.body.style.paddingRight = `${padding + scrollbarWidth}px`;
    }
    document.body.style.overflow = 'hidden';
  }
  scrollLocks += 1;
  return () => {
    scrollLocks -= 1;
    if (scrollLocks === 0) {
      document.body.style.overflow = originalOverflow;
      document.body.style.paddingRight = originalPaddingRight;
    }
  };
}

function getFocusable(dialog: HTMLDialogElement) {
  return Array.from(dialog.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(element =>
    element.tabIndex >= 0 && !element.matches(':disabled') && !element.closest('[inert], [hidden], [aria-hidden="true"]')
    && element.getClientRects().length > 0 && window.getComputedStyle(element).visibility !== 'hidden'
  );
}

export function BaseModal({
  isOpen, title, description, icon, children, footer, onClose, size = 'md', role = 'dialog',
  busy = false, dismissible = true, closeOnBackdrop = true, initialFocusRef, variant = 'standard',
}: BaseModalProps) {
  const compact = variant === 'confirmation';
  const id = useId();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const pointerStartedOnBackdrop = useRef(false);
  const latest = useRef({ onClose, busy, dismissible, initialFocusRef });
  latest.current = { onClose, busy, dismissible, initialFocusRef };

  useLayoutEffect(() => {
    if (!isOpen || !dialogRef.current) return;
    const dialog = dialogRef.current;
    const trigger = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    dialog.showModal();
    const unlock = lockScroll();
    const initial = latest.current.initialFocusRef?.current;
    if (initial && dialog.contains(initial) && !initial.matches(':disabled')) initial.focus({ preventScroll: true });
    else contentRef.current?.focus({ preventScroll: true });

    return () => {
      if (dialog.open) dialog.close();
      unlock();
      if (trigger?.isConnected) trigger.focus({ preventScroll: true });
    };
  }, [isOpen]);

  const requestClose = () => {
    if (!latest.current.busy && latest.current.dismissible) latest.current.onClose();
  };

  if (!isOpen) return null;

  const descriptionContent = description && <p id={`${id}-description`} className="whitespace-pre-line break-words text-sm leading-6 text-gray-600">{description}</p>;

  return createPortal(
    <dialog
      ref={dialogRef}
      role={role}
      aria-modal="true"
      aria-labelledby={`${id}-title`}
      aria-describedby={description ? `${id}-description` : undefined}
      aria-busy={busy}
      className="fixed inset-0 m-0 h-full max-h-none w-full max-w-none bg-transparent p-4 text-gray-900 backdrop:bg-slate-900/50 open:flex open:items-center open:justify-center sm:p-6"
      onCancel={event => {
        if (event.target !== event.currentTarget) return;
        event.preventDefault();
        event.stopPropagation();
        requestClose();
      }}
      onPointerDown={event => { pointerStartedOnBackdrop.current = event.target === event.currentTarget; }}
      onPointerUp={event => { pointerStartedOnBackdrop.current = pointerStartedOnBackdrop.current && event.target === event.currentTarget; }}
      onPointerCancel={() => { pointerStartedOnBackdrop.current = false; }}
      onClick={event => {
        event.stopPropagation();
        if (event.target === event.currentTarget && pointerStartedOnBackdrop.current && closeOnBackdrop) requestClose();
        pointerStartedOnBackdrop.current = false;
      }}
      onKeyDown={event => {
        if (!event.currentTarget.contains(event.target as Node)) return;
        if (event.key === 'Escape') {
          event.stopPropagation();
          return;
        }
        if (event.key !== 'Tab') return;
        event.stopPropagation();
        const elements = getFocusable(event.currentTarget);
        const first = elements[0];
        const last = elements[elements.length - 1];
        if (!first || !last) {
          event.preventDefault();
          contentRef.current?.focus();
        } else if (event.shiftKey && (document.activeElement === first || !elements.includes(document.activeElement as HTMLElement))) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && (document.activeElement === last || !elements.includes(document.activeElement as HTMLElement))) {
          event.preventDefault();
          first.focus();
        }
      }}
    >
      <div ref={contentRef} tabIndex={-1} className={`relative flex max-h-[calc(100dvh-2rem)] w-full min-w-0 flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white text-left outline-none sm:max-h-[calc(100dvh-3rem)] ${WIDTHS[size]} ${compact ? 'gap-4 px-5 py-7 shadow-lg' : 'shadow-xl'}`}>
        <div className={`flex items-start gap-3 ${compact ? 'min-h-0 overflow-y-auto overscroll-contain pr-12' : 'shrink-0 border-b border-gray-100 p-5 pr-16 sm:p-6 sm:pr-20'}`}>
          {icon && <span aria-hidden="true" className="shrink-0">{icon}</span>}
          <div className={`min-w-0 flex-1 ${compact ? 'pt-1' : ''}`}>
            <h2 id={`${id}-title`} className="break-words text-lg font-semibold leading-6 text-gray-900">{title}</h2>
            {compact && descriptionContent && <div className="mt-1">{descriptionContent}</div>}
          </div>
          <button
            type="button"
            onClick={requestClose}
            disabled={busy || !dismissible}
            aria-label="Close dialog"
            className="absolute right-2 top-2 inline-flex h-10 w-10 items-center justify-center rounded-lg text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#38A3A5] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <X aria-hidden="true" className="h-5 w-5" />
          </button>
        </div>
        {((!compact && description) || children) && <div className={`min-h-0 overflow-y-auto overscroll-contain ${compact ? '' : 'p-5 sm:p-6'}`}>
          {!compact && descriptionContent}
          {children && <div className={!compact && description ? 'mt-4' : undefined}>{children}</div>}
        </div>}
        {footer && <div className={`shrink-0 ${compact ? 'mt-1' : 'border-t border-gray-100 bg-gray-50 p-5 sm:px-6 sm:py-4'}`}>{footer}</div>}
      </div>
    </dialog>,
    document.body
  );
}
