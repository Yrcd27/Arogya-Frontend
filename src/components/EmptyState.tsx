import { useId, type ReactNode } from 'react';
import { Inbox } from 'lucide-react';

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: { label: string; onClick: () => void };
  variant?: 'page' | 'section';
  surface?: boolean;
  headingLevel?: 2 | 3 | 4 | 5;
  className?: string;
}

export function EmptyState({ icon, title, description, action, variant = 'section', surface = variant === 'page', headingLevel, className = '' }: EmptyStateProps) {
  const titleId = useId();
  const level = headingLevel ?? (variant === 'page' ? 2 : 3);
  const Heading = ({ 2: 'h2', 3: 'h3', 4: 'h4', 5: 'h5' } as const)[level];

  return (
    <section aria-labelledby={titleId} className={`flex min-w-0 flex-col items-center justify-center px-5 text-center ${variant === 'page' ? 'flex-1 py-10' : 'py-6'} ${surface ? 'rounded-xl border border-gray-200 bg-white shadow-sm' : ''} ${className}`}>
      <div aria-hidden="true" className="mb-3 shrink-0 text-[#38A3A5] [&>svg]:h-10 [&>svg]:w-10">
        {icon ?? <Inbox />}
      </div>
      <Heading id={titleId} className={`break-words font-semibold text-gray-900 ${variant === 'page' ? 'text-base' : 'text-sm'}`}>
        {title}
      </Heading>
      {description && <p className="mt-2 max-w-md break-words text-sm leading-6 text-gray-500">{description}</p>}
      {action && (
        <button type="button" onClick={action.onClick} className="mt-4 inline-flex min-h-10 items-center justify-center rounded-lg bg-[#38A3A5] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#2d8284]">
          {action.label}
        </button>
      )}
    </section>
  );
}
