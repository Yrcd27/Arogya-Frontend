import type { ReactNode } from 'react';
import { ConfirmDialog } from './dialogs/ConfirmDialog';

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: ReactNode;
  confirmLabel?: string;
  confirmClassName?: string;
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
  loading?: boolean;
}

export function ConfirmModal(props: ConfirmModalProps) {
  return <ConfirmDialog {...props} />;
}
