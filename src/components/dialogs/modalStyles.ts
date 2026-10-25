const BUTTON_BASE = 'inline-flex h-10 items-center justify-center gap-2 whitespace-nowrap rounded-lg px-4 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50';

export const MODAL_OVERLAY = 'fixed inset-0 flex items-center justify-center bg-slate-900/50 p-4';
export const MODAL_PANEL = 'w-full rounded-2xl border border-gray-200 bg-white shadow-xl';
export const MODAL_PANEL_SCROLL = `${MODAL_PANEL} max-h-[90vh] overflow-y-auto`;
export const MODAL_PANEL_FLEX = `${MODAL_PANEL} flex max-h-[90vh] flex-col overflow-hidden`;
export const MODAL_HEAD_FIXED = 'flex shrink-0 items-center justify-between gap-3 border-b border-gray-100 px-5 py-4 sm:px-6';
export const MODAL_BODY = 'min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-4 sm:px-6';
export const MODAL_FOOT_FIXED = 'flex shrink-0 flex-wrap items-center justify-end gap-3 border-t border-gray-100 bg-gray-50 px-5 py-3 sm:px-6';
export const MODAL_HEADER = 'mb-4 flex items-center justify-between gap-3';
export const MODAL_TITLE = 'text-lg font-semibold leading-6 text-gray-900';
export const MODAL_CLOSE = 'inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#38A3A5] disabled:cursor-not-allowed disabled:opacity-50';
export const MODAL_FOOTER = 'mt-5 flex flex-wrap items-center justify-end gap-3 border-t border-gray-100 pt-4';
export const MODAL_ALERT = 'rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700';
export const MODAL_INFO_PANEL = 'space-y-1.5 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3.5';
export const MODAL_TEXT_BLOCK = 'notranslate whitespace-pre-wrap break-words rounded-lg border border-gray-200 bg-gray-50 px-3.5 py-3 text-sm leading-6 text-gray-900';
export const DETAIL_LABEL = 'text-xs font-semibold uppercase tracking-wide text-gray-600';
export const DETAIL_VALUE = 'mt-1.5 break-words text-sm font-medium leading-5 text-gray-900';

export const BUTTON_PRIMARY = `${BUTTON_BASE} bg-[#38A3A5] text-white hover:bg-[#2d8284] focus-visible:ring-[#38A3A5]`;
export const BUTTON_OUTLINE = `${BUTTON_BASE} border border-[#38A3A5] bg-white text-[#2d8284] hover:bg-[#38A3A5]/10 focus-visible:ring-[#38A3A5]`;
export const BUTTON_SECONDARY = `${BUTTON_BASE} border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 focus-visible:ring-[#38A3A5]`;
export const BUTTON_DANGER = `${BUTTON_BASE} border border-red-200 bg-white text-red-600 hover:bg-red-50 focus-visible:ring-red-500`;
