import { EyeIcon } from 'lucide-react';

interface ViewActionProps {
  onClick: () => void;
  label: string;
  disabled?: boolean;
  opensDialog?: boolean;
  className?: string;
}

export function ViewAction({ onClick, label, disabled = false, opensDialog = false, className = '' }: ViewActionProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      aria-haspopup={opensDialog ? 'dialog' : undefined}
      className={`inline-flex h-8 items-center gap-1.5 whitespace-nowrap rounded-md px-1.5 text-sm font-medium text-[#38A3A5] transition-colors hover:bg-[#38A3A5]/10 hover:text-[#2d8284] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#38A3A5] disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
    >
      <EyeIcon aria-hidden="true" className="h-4 w-4 shrink-0" />
      View
    </button>
  );
}
