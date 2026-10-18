import { LogOut } from 'lucide-react';
import { ConfirmDialog } from './dialogs/ConfirmDialog';

interface LogoutConfirmModalProps {
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function LogoutConfirmModal({ isOpen, onConfirm, onCancel }: LogoutConfirmModalProps) {
  return (
    <ConfirmDialog
      isOpen={isOpen}
      title="Confirm Logout"
      message="Are you sure you want to logout?"
      confirmLabel="Logout"
      icon={<LogOut className="h-5 w-5" />}
      onConfirm={onConfirm}
      onCancel={onCancel}
    />
  );
}
