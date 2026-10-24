import { TrashIcon, XCircle } from 'lucide-react';
import { RowActionsMenu, type RowAction } from '../RowActionsMenu';
import type { Clinic } from '../../types/clinic';

interface ClinicActionsMenuProps {
  clinic: Clinic;
  disabled?: boolean;
  onCancel: () => void;
  onDelete: () => void;
}

export function ClinicActionsMenu({ clinic, disabled = false, onCancel, onDelete }: ClinicActionsMenuProps) {
  const actions: RowAction[] = [];
  if (clinic.status === 'SCHEDULED' || clinic.status === 'IN_PROGRESS') {
    actions.push({ key: 'cancel', label: 'Cancel Clinic', icon: <XCircle aria-hidden="true" className="h-4 w-4" />, onSelect: onCancel, destructive: true });
  }
  actions.push({ key: 'delete', label: 'Delete Clinic', icon: <TrashIcon aria-hidden="true" className="h-4 w-4" />, onSelect: onDelete, destructive: true });
  return <RowActionsMenu label={`More actions for ${clinic.clinicName}`} actions={actions} disabled={disabled} buttonClassName="h-10 w-10 border border-gray-200" iconClassName="h-4 w-4" />;
}
