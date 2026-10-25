export const NO_TRANSLATE_CLASS = 'notranslate';

export function noTranslateClass(className = ''): string {
  return className ? `${className} ${NO_TRANSLATE_CLASS}` : NO_TRANSLATE_CLASS;
}

export function noTranslateProps(className = '', active = true): { translate?: 'no'; className: string } {
  return active ? { translate: 'no', className: noTranslateClass(className) } : { className };
}
