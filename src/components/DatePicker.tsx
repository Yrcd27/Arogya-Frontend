import {
  useCallback, useEffect, useId, useMemo, useRef, useState,
  type ChangeEventHandler, type InputHTMLAttributes, type KeyboardEvent,
} from 'react';
import { CalendarDays, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { DropdownMenu } from './DropdownMenu';
import { setNativeInputValue } from '../utils/inputEvents';

interface DatePickerProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'value' | 'defaultValue' | 'onChange' | 'size'> {
  value: string;
  onChange?: ChangeEventHandler<HTMLInputElement>;
  size?: 'default' | 'compact';
  showToday?: boolean;
}

type DateParts = { year: number; month: number; day: number };

const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

function parseDate(value: string): DateParts | null {
  const match = DATE_PATTERN.exec(value);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const candidate = new Date(Date.UTC(year, month - 1, day));
  return candidate.getUTCFullYear() === year && candidate.getUTCMonth() === month - 1 && candidate.getUTCDate() === day
    ? { year, month, day } : null;
}

function dateString({ year, month, day }: DateParts): string {
  return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function todayString(): string {
  return dateString(todayParts());
}

function todayParts(): DateParts {
  const today = new Date();
  return { year: today.getFullYear(), month: today.getMonth() + 1, day: today.getDate() };
}

function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

function shiftDate(value: string, days: number): string {
  const parts = parseDate(value);
  if (!parts) return value;
  const date = new Date(Date.UTC(parts.year, parts.month - 1, parts.day + days));
  return dateString({ year: date.getUTCFullYear(), month: date.getUTCMonth() + 1, day: date.getUTCDate() });
}

function shiftMonth(value: string, months: number): string {
  const parts = parseDate(value);
  if (!parts) return value;
  const target = new Date(Date.UTC(parts.year, parts.month - 1 + months, 1));
  return dateString({
    year: target.getUTCFullYear(), month: target.getUTCMonth() + 1,
    day: Math.min(parts.day, daysInMonth(target.getUTCFullYear(), target.getUTCMonth() + 1)),
  });
}

function displayDate(value: string): string {
  const parts = parseDate(value);
  if (!parts) return value;
  return new Intl.DateTimeFormat('en-US', { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC' })
    .format(new Date(Date.UTC(parts.year, parts.month - 1, parts.day)));
}

function withinRange(value: string, min?: string, max?: string): boolean {
  return (!min || value >= min) && (!max || value <= max);
}

function clampDate(value: string, min?: string, max?: string): string {
  if (min && value < min) return min;
  if (max && value > max) return max;
  return value;
}

function MonthSelector({ month, onChange }: { month: number; onChange: (month: number) => void }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const dismiss = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('pointerdown', dismiss, true);
    return () => document.removeEventListener('pointerdown', dismiss, true);
  }, [open]);

  return (
    <div ref={containerRef} className="relative min-w-0 flex-1">
      <button type="button" aria-haspopup="listbox" aria-expanded={open} onClick={() => setOpen(current => !current)}
        className="inline-flex h-9 w-full items-center justify-between gap-2 rounded-lg border border-gray-300 bg-white px-2 text-left text-sm font-medium text-gray-800">
        <span className="truncate">{MONTHS[month - 1]}</span><ChevronDown aria-hidden="true" className="h-4 w-4 shrink-0 text-gray-500" />
      </button>
      {open && <div role="listbox" aria-label="Month" className="absolute left-0 top-full z-20 mt-1 max-h-[11.25rem] w-full overflow-y-auto rounded-lg border border-gray-200 bg-white p-1 shadow-lg">
        {MONTHS.map((label, index) => <button key={label} type="button" role="option" aria-selected={month === index + 1}
          onClick={() => { onChange(index + 1); setOpen(false); }}
          className={`flex h-9 w-full items-center rounded-md px-2 text-left text-sm ${month === index + 1 ? 'bg-[#e6f6f6] font-semibold text-[#2d8284]' : 'text-gray-700 hover:bg-gray-100'}`}>{label}</button>)}
      </div>}
    </div>
  );
}

export function DatePicker({
  value, onChange, onBlur, onInvalid, className = '', id, name, form, disabled, required,
  min, max, placeholder = 'Select date', size = 'default', showToday = true, ...props
}: DatePickerProps) {
  const generatedId = useId();
  const controlId = id ?? generatedId;
  const popupId = `${controlId}-calendar`;
  const nativeRef = useRef<HTMLInputElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const yearControlRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [visibleMonth, setVisibleMonth] = useState(() => parseDate(value) ?? todayParts());
  const [focusedDate, setFocusedDate] = useState(() => parseDate(value) ? value : todayString());
  const [yearInput, setYearInput] = useState(() => String(parseDate(value)?.year ?? todayParts().year));
  const [yearSuggestionsOpen, setYearSuggestionsOpen] = useState(false);
  const minDate = typeof min === 'string' && parseDate(min) ? min : undefined;
  const maxDate = typeof max === 'string' && parseDate(max) ? max : undefined;

  const close = useCallback(() => {
    setOpen(false);
    window.requestAnimationFrame(() => nativeRef.current?.dispatchEvent(new FocusEvent('focusout', { bubbles: true })));
  }, []);

  const setNativeValue = (nextValue: string) => {
    if (!nativeRef.current || disabled) return;
    setNativeInputValue(nativeRef.current, nextValue);
  };

  const openPicker = () => {
    if (disabled) return;
    const initial = clampDate(parseDate(value) ? value : todayString(), minDate, maxDate);
    const parts = parseDate(initial);
    if (!parts) return;
    setFocusedDate(initial);
    setVisibleMonth(parts);
    setOpen(true);
  };

  useEffect(() => {
    if (!open) return;
    window.requestAnimationFrame(() => {
      document.getElementById(popupId)?.querySelector<HTMLButtonElement>(`[data-picker-date="${focusedDate}"]`)?.focus({ preventScroll: true });
    });
  }, [focusedDate, open, popupId, visibleMonth.month, visibleMonth.year]);

  useEffect(() => {
    if (disabled && open) close();
  }, [close, disabled, open]);

  useEffect(() => {
    setYearInput(String(visibleMonth.year));
  }, [visibleMonth.year]);

  useEffect(() => {
    if (!yearSuggestionsOpen) return;
    const dismiss = (event: PointerEvent) => {
      if (!yearControlRef.current?.contains(event.target as Node)) setYearSuggestionsOpen(false);
    };
    document.addEventListener('pointerdown', dismiss, true);
    return () => document.removeEventListener('pointerdown', dismiss, true);
  }, [yearSuggestionsOpen]);

  const moveFocus = (next: string) => {
    const clamped = clampDate(next, minDate, maxDate);
    const parts = parseDate(clamped);
    if (!parts) return;
    setFocusedDate(clamped);
    setVisibleMonth(parts);
  };

  const handleDayKeyDown = (event: KeyboardEvent<HTMLButtonElement>, day: string) => {
    let next: string | null = null;
    if (event.key === 'ArrowLeft') next = shiftDate(day, -1);
    else if (event.key === 'ArrowRight') next = shiftDate(day, 1);
    else if (event.key === 'ArrowUp') next = shiftDate(day, -7);
    else if (event.key === 'ArrowDown') next = shiftDate(day, 7);
    else if (event.key === 'Home') next = shiftDate(day, -new Date(`${day}T00:00:00`).getDay());
    else if (event.key === 'End') next = shiftDate(day, 6 - new Date(`${day}T00:00:00`).getDay());
    else if (event.key === 'PageUp') next = shiftMonth(day, event.shiftKey ? -12 : -1);
    else if (event.key === 'PageDown') next = shiftMonth(day, event.shiftKey ? 12 : 1);
    if (next) {
      event.preventDefault();
      moveFocus(next);
    }
  };

  const dayCount = daysInMonth(visibleMonth.year, visibleMonth.month);
  const firstWeekday = new Date(Date.UTC(visibleMonth.year, visibleMonth.month - 1, 1)).getUTCDay();
  const years = useMemo(() => {
    const lower = parseDate(minDate ?? '')?.year ?? visibleMonth.year - 100;
    const upper = parseDate(maxDate ?? '')?.year ?? visibleMonth.year + 100;
    return Array.from({ length: upper - lower + 1 }, (_, index) => lower + index);
  }, [maxDate, minDate, visibleMonth.year]);
  const today = todayString();

  const changeVisibleMonth = (year: number, month: number) => {
    const day = Math.min(parseDate(focusedDate)?.day ?? 1, daysInMonth(year, month));
    moveFocus(dateString({ year, month, day }));
  };

  const tryChangeYear = (nextYear: string) => {
    if (!/^\d{4}$/.test(nextYear)) return;
    const year = Number(nextYear);
    if (year < 1 || year > 9999) return;
    changeVisibleMonth(year, visibleMonth.month);
  };

  const matchingYears = useMemo(() => years.filter(year => String(year).includes(yearInput)), [yearInput, years]);

  return (
    <>
      <input {...props} ref={nativeRef} id={`${controlId}-native`} type="date" name={name} form={form}
        value={value} min={min} max={max} required={required} disabled={disabled} tabIndex={-1} aria-hidden="true"
        className="sr-only" onChange={onChange} onBlur={onBlur}
        onInvalid={event => { onInvalid?.(event); event.preventDefault(); triggerRef.current?.focus(); }} />
      <button ref={triggerRef} id={controlId} type="button" disabled={disabled} aria-haspopup="dialog"
        aria-expanded={open} aria-controls={open ? popupId : undefined} aria-required={required}
        aria-invalid={props['aria-invalid']} aria-describedby={props['aria-describedby']} aria-label={props['aria-label']}
        onClick={() => open ? close() : openPicker()}
        className={`form-control-focus inline-flex w-full items-center gap-3 rounded-lg border border-gray-300 bg-white px-3 text-left text-gray-900 disabled:cursor-not-allowed disabled:bg-gray-50 disabled:opacity-60 ${size === 'compact' ? 'h-10' : 'h-11'} ${className}`}>
        <span className={`min-w-0 flex-1 truncate ${value ? 'text-gray-900' : 'text-gray-500'}`}>{value ? displayDate(value) : placeholder}</span>
        <CalendarDays aria-hidden="true" className="h-5 w-5 shrink-0 text-gray-500" />
      </button>
      {open && !disabled && (
        <DropdownMenu anchorRef={triggerRef} id={popupId} role="dialog" label="Choose date" minWidth={304} maxWidth={360}
          onDismiss={close} className="overflow-y-auto p-2.5"
          onKeyDown={event => {
            if (event.key === 'Escape') {
              event.preventDefault(); event.stopPropagation(); close(); triggerRef.current?.focus({ preventScroll: true });
            }
          }}>
          <div className="flex items-center gap-1.5">
            <button type="button" aria-label="Previous month" onClick={() => moveFocus(shiftMonth(focusedDate, -1))}
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-gray-600 hover:bg-gray-100">
              <ChevronLeft aria-hidden="true" className="h-4 w-4" />
            </button>
            <MonthSelector month={visibleMonth.month} onChange={month => changeVisibleMonth(visibleMonth.year, month)} />
            <div ref={yearControlRef} className="relative w-[4.75rem] shrink-0">
              <input aria-label="Year" inputMode="numeric" maxLength={4} value={yearInput}
                onFocus={event => { event.currentTarget.select(); setYearSuggestionsOpen(true); }}
                onChange={event => { const next = event.target.value.replace(/\D/g, '').slice(0, 4); setYearInput(next); tryChangeYear(next); setYearSuggestionsOpen(true); }}
                onKeyDown={event => {
                  if (event.key === 'Enter') { event.preventDefault(); tryChangeYear(yearInput); setYearSuggestionsOpen(false); }
                }}
                onBlur={() => window.setTimeout(() => setYearInput(String(visibleMonth.year)), 0)}
                className="h-9 w-full rounded-lg border border-gray-300 bg-white px-2 text-center text-sm font-medium" />
              {yearSuggestionsOpen && <div role="listbox" aria-label="Year suggestions" className="absolute right-0 top-full z-20 mt-1 max-h-[11.25rem] w-28 overflow-y-auto rounded-lg border border-gray-200 bg-white p-1 shadow-lg">
                {matchingYears.length ? matchingYears.map(year => <button key={year} type="button" role="option" aria-selected={year === visibleMonth.year}
                  onMouseDown={event => event.preventDefault()} onClick={() => { changeVisibleMonth(year, visibleMonth.month); setYearSuggestionsOpen(false); }}
                  className={`flex h-9 w-full items-center rounded-md px-2 text-left text-sm ${year === visibleMonth.year ? 'bg-[#e6f6f6] font-semibold text-[#2d8284]' : 'text-gray-700 hover:bg-gray-100'}`}>{year}</button>)
                  : <p className="px-2 py-2 text-xs text-gray-500">Type a four-digit year</p>}
              </div>}
            </div>
            <button type="button" aria-label="Next month" onClick={() => moveFocus(shiftMonth(focusedDate, 1))}
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-gray-600 hover:bg-gray-100">
              <ChevronRight aria-hidden="true" className="h-4 w-4" />
            </button>
          </div>
          <div className="mt-2 grid grid-cols-7 gap-1" role="grid" aria-label={`${MONTHS[visibleMonth.month - 1]} ${visibleMonth.year}`}>
            <div role="row" className="contents">
              {WEEKDAYS.map(day => <span key={day} role="columnheader" className="py-1 text-center text-xs font-medium text-gray-500">{day}</span>)}
            </div>
            {Array.from({ length: Math.ceil((firstWeekday + dayCount) / 7) }, (_, week) => (
              <div key={`week-${week}`} role="row" className="contents">
                {Array.from({ length: 7 }, (_, weekday) => {
                  const dayNumber = week * 7 + weekday - firstWeekday + 1;
                  if (dayNumber < 1 || dayNumber > dayCount) return <span key={`blank-${week}-${weekday}`} role="gridcell" />;
                  const day = dateString({ year: visibleMonth.year, month: visibleMonth.month, day: dayNumber });
                  const unavailable = !withinRange(day, minDate, maxDate);
                  const selected = day === value;
                  const isToday = day === today;
                  return (
                    <button key={day} type="button" role="gridcell" data-picker-date={day} tabIndex={day === focusedDate ? 0 : -1}
                      disabled={unavailable} aria-selected={selected} aria-current={isToday ? 'date' : undefined}
                      aria-label={displayDate(day)} onKeyDown={event => handleDayKeyDown(event, day)}
                      onClick={() => { setNativeValue(day); close(); triggerRef.current?.focus({ preventScroll: true }); }}
                      className={`h-9 rounded-lg text-sm transition-colors disabled:cursor-not-allowed disabled:text-gray-300 ${selected ? 'bg-[#38A3A5] font-semibold text-white' : isToday ? 'border border-[#38A3A5] font-semibold text-[#2d8284]' : 'text-gray-700 hover:bg-[#e6f6f6]'}`}>
                      {dayNumber}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
          {(!required || showToday) && <div className="mt-2 flex items-center justify-between border-t border-gray-100 pt-2">
            <button type="button" disabled={required || !value} onClick={() => { setNativeValue(''); close(); triggerRef.current?.focus({ preventScroll: true }); }}
              className="min-h-9 rounded-lg px-2.5 text-sm font-medium text-gray-600 hover:bg-gray-100 disabled:invisible">Clear</button>
            {showToday && <button type="button" disabled={!withinRange(today, minDate, maxDate)}
              onClick={() => { setNativeValue(today); close(); triggerRef.current?.focus({ preventScroll: true }); }}
              className="min-h-9 rounded-lg px-2.5 text-sm font-semibold text-[#2d8284] hover:bg-[#e6f6f6] disabled:cursor-not-allowed disabled:opacity-50">Today</button>}
          </div>}
        </DropdownMenu>
      )}
    </>
  );
}
