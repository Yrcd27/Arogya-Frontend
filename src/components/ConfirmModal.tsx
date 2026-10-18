import { ConfirmDialog } from './dialogs/ConfirmDialog';

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  confirmClassName?: string;
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
  loading?: boolean;
}

export function ConfirmModal(props: ConfirmModalProps) {
  return <ConfirmDialog {...props} />;
}
