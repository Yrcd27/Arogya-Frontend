import type { ElementType, HTMLAttributes } from 'react';
import { noTranslateClass } from '../utils/noTranslate';

type NoTranslateProps = HTMLAttributes<HTMLElement> & { as?: ElementType };

export function NoTranslate({ as: Tag = 'span', className = '', children, ...rest }: NoTranslateProps) {
  return <Tag {...rest} translate="no" className={noTranslateClass(className)}>{children}</Tag>;
}
