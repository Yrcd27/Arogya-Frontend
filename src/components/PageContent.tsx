import type { ReactNode } from 'react';

export function PageContent({ children, scrollable = false, fill = false, className = '' }: { children: ReactNode; scrollable?: boolean; fill?: boolean; className?: string }) {
  return <main className={`min-w-0 flex-1 space-y-5 p-4 sm:p-6${fill ? ' flex flex-col [&>*]:shrink-0' : ''}${scrollable ? ' overflow-auto' : ''}${className ? ` ${className}` : ''}`}>{children}</main>;
}
