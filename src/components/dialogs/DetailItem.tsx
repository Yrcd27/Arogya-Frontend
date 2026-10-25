import type { ReactNode } from 'react';
import { DETAIL_LABEL as LABEL, DETAIL_VALUE, MODAL_TEXT_BLOCK } from './modalStyles';
import { noTranslateClass } from '../../utils/noTranslate';

export function DetailGrid({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <dl className={`grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2 ${className}`}>{children}</dl>;
}

export function DetailItem({ label, children, missing = false, wide = false, translatable = false }: { label: string; children: ReactNode; missing?: boolean; wide?: boolean; translatable?: boolean }) {
  return (
    <div className={`min-w-0 ${wide ? 'sm:col-span-2' : ''}`}>
      <dt className={LABEL}>{label}</dt>
      <dd translate={missing || translatable ? undefined : 'no'} className={missing ? 'mt-1.5 break-words text-sm leading-5 text-gray-500' : translatable ? DETAIL_VALUE : noTranslateClass(DETAIL_VALUE)}>{children}</dd>
    </div>
  );
}

export function DetailText({ label, children, missing = false }: { label: string; children: ReactNode; missing?: boolean }) {
  return (
    <div className="min-w-0">
      <p className={LABEL}>{label}</p>
      <p translate={missing ? undefined : 'no'} className={`mt-2 ${MODAL_TEXT_BLOCK} ${missing ? '!text-gray-500' : ''}`}>{children}</p>
    </div>
  );
}
