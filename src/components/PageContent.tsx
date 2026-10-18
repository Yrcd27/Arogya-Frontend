import type { ReactNode } from 'react';

export function PageContent({ children, scrollable = false, className = '' }: { children: ReactNode; scrollable?: boolean; className?: string }) {
  return <main className={`min-w-0 flex-1 space-y-5 p-4 sm:p-6${scrollable ? ' overflow-auto' : ''}${className ? ` ${className}` : ''}`}>{children}</main>;
}
