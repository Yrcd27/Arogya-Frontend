import { statusBadgeStyle, statusLabel } from '../utils/statusLabels';

interface StatusBadgeProps {
  status: string;
  className?: string;
}

export function StatusBadge({ status, className = '' }: StatusBadgeProps) {
  return (
    <span className={`inline-flex items-center whitespace-nowrap rounded-full px-3 py-1 text-xs font-medium ${statusBadgeStyle(status)} ${className}`}>
      {statusLabel(status)}
    </span>
  );
}
