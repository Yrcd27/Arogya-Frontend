const STATUS_LABELS: Record<string, string> = {
  PENDING: 'Pending',
  SCHEDULED: 'Scheduled',
  IN_PROGRESS: 'In Progress',
  SERVING: 'Serving',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
};

export function statusLabel(status: string | null | undefined): string {
  const key = (status ?? '').trim().toUpperCase();
  if (!key) return 'Unknown';
  return STATUS_LABELS[key] ?? key.toLowerCase().split('_').filter(Boolean).map(word => word[0].toUpperCase() + word.slice(1)).join(' ');
}

const NEUTRAL_STYLE = 'bg-gray-100 text-gray-700';

const STATUS_STYLES: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-amber-700',
  SCHEDULED: 'bg-[#e6f6f6] text-[#2d8284]',
  IN_PROGRESS: 'bg-blue-100 text-blue-700',
  SERVING: 'bg-blue-100 text-blue-700',
  COMPLETED: 'bg-green-100 text-green-700',
  CANCELLED: 'bg-red-100 text-red-700',
};

export function statusBadgeStyle(status: string | null | undefined): string {
  return STATUS_STYLES[(status ?? '').trim().toUpperCase()] ?? NEUTRAL_STYLE;
}
