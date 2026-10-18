import { useCallback, useEffect, useId, useRef, useState, type ChangeEventHandler, type InputHTMLAttributes, type KeyboardEvent } from 'react';
import { Clock } from 'lucide-react';
import { DropdownMenu } from './DropdownMenu';
import { setNativeInputValue } from '../utils/inputEvents';

interface TimePickerProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'value' | 'defaultValue' | 'onChange' | 'size'> {
  value: string;
  onChange?: ChangeEventHandler<HTMLInputElement>;
  size?: 'default' | 'compact';
}

const TIME_PATTERN = /^(\d{2}):(\d{2})(?::(\d{2}))?$/;

function parseTime(value: string) {
  const match = TIME_PATTERN.exec(value);
  if (!match) return null;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  const second = Number(match[3] ?? '0');
  if (hour > 23 || minute > 59 || second > 59) return null;
  return { hour, minute, second, hasSeconds: match[3] !== undefined };
}

function displayTime(value: string): string {
  const parsed = parseTime(value);
  if (!parsed) return value;
  const hour = parsed.hour % 12 || 12;
  const suffix = parsed.hour >= 12 ? 'PM' : 'AM';
  return `${hour}:${String(parsed.minute).padStart(2, '0')} ${suffix}`;
}

function secondsFromMidnight(value: string): number | null {
  const parsed = parseTime(value);
  return parsed ? parsed.hour * 3600 + parsed.minute * 60 + parsed.second : null;
}

export function TimePicker({
  value, onChange, onBlur, onInvalid, className = '', id, name, form, disabled, required,
  min, max, step, placeholder = 'Select time', size = 'default', ...props
}: TimePickerProps) {
  const generatedId = useId();
  const controlId = id ?? generatedId;
  const popupId = `${controlId}-time-picker`;
  const nativeRef = useRef<HTMLInputElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const hourRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [hour, setHour] = useState('12');
  const [minute, setMinute] = useState('00');
  const [second, setSecond] = useState('00');
  const [period, setPeriod] = useState<'AM' | 'PM'>('AM');
  const stepNumber = typeof step === 'number' ? step : Number(step);
  const includeSeconds = Number.isFinite(stepNumber) && stepNumber > 0 && stepNumber < 60 || !!parseTime(value)?.hasSeconds;

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
    const now = new Date();
    const parsed = parseTime(value) ?? { hour: now.getHours(), minute: now.getMinutes(), second: 0, hasSeconds: includeSeconds };
    setHour(String(parsed.hour % 12 || 12).padStart(2, '0'));
    setMinute(String(parsed.minute).padStart(2, '0'));
    setSecond(String(parsed.second).padStart(2, '0'));
    setPeriod(parsed.hour >= 12 ? 'PM' : 'AM');
    setOpen(true);
  };

  useEffect(() => {
    if (open) window.requestAnimationFrame(() => hourRef.current?.focus({ preventScroll: true }));
  }, [open]);

  useEffect(() => {
    if (disabled && open) close();
  }, [close, disabled, open]);

  const hour24 = (Number(hour) % 12) + (period === 'PM' ? 12 : 0);
  const hourValue = Number(hour);
  const minuteValue = Number(minute);
  const hourValid = /^\d{1,2}$/.test(hour) && hourValue >= 1 && hourValue <= 12;
  const minuteValid = /^\d{1,2}$/.test(minute) && minuteValue >= 0 && minuteValue <= 59;
  const nextValue = hourValid && minuteValid ? `${String(hour24).padStart(2, '0')}:${String(minuteValue).padStart(2, '0')}${includeSeconds ? `:${second}` : ''}` : '';
  const nextSeconds = secondsFromMidnight(nextValue);
  const minSeconds = typeof min === 'string' ? secondsFromMidnight(min) : null;
  const maxSeconds = typeof max === 'string' ? secondsFromMidnight(max) : null;
  const outsideRange = nextSeconds === null || minSeconds !== null && nextSeconds < minSeconds || maxSeconds !== null && nextSeconds > maxSeconds;
  const inputError = !hourValid || !minuteValid ? 'Enter an hour from 1 to 12 and minutes from 00 to 59.' : outsideRange ? 'Choose a time within the allowed range.' : '';

  const adjustValue = (field: 'hour' | 'minute', amount: number) => {
    if (field === 'hour') {
      const next = ((Math.max(1, Math.min(12, Number(hour) || 12)) - 1 + amount + 12) % 12) + 1;
      setHour(String(next).padStart(2, '0'));
      return;
    }
    const next = (Math.max(0, Math.min(59, Number(minute) || 0)) + amount + 60) % 60;
    setMinute(String(next).padStart(2, '0'));
  };

  const handleNumericKeyDown = (event: KeyboardEvent<HTMLInputElement>, field: 'hour' | 'minute') => {
    if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
      event.preventDefault();
      adjustValue(field, event.key === 'ArrowUp' ? 1 : -1);
    } else if (event.key === 'Enter' && !inputError) {
      event.preventDefault();
      setNativeValue(nextValue); close(); triggerRef.current?.focus({ preventScroll: true });
    }
  };

  return (
    <>
      <input {...props} ref={nativeRef} id={`${controlId}-native`} type="time" name={name} form={form}
        value={value} min={min} max={max} step={step} required={required} disabled={disabled} tabIndex={-1} aria-hidden="true"
        className="sr-only" onChange={onChange} onBlur={onBlur}
        onInvalid={event => { onInvalid?.(event); event.preventDefault(); triggerRef.current?.focus(); }} />
      <button ref={triggerRef} id={controlId} type="button" disabled={disabled} aria-haspopup="dialog"
        aria-expanded={open} aria-controls={open ? popupId : undefined} aria-required={required}
        aria-invalid={props['aria-invalid']} aria-describedby={props['aria-describedby']} aria-label={props['aria-label']}
        onClick={() => open ? close() : openPicker()}
        className={`form-control-focus inline-flex w-full items-center gap-3 rounded-lg border border-gray-300 bg-white px-3 text-left text-gray-900 disabled:cursor-not-allowed disabled:bg-gray-50 disabled:opacity-60 ${size === 'compact' ? 'h-10' : 'h-11'} ${className}`}>
        <span className={`min-w-0 flex-1 truncate ${value ? 'text-gray-900' : 'text-gray-500'}`}>{value ? displayTime(value) : placeholder}</span>
        <Clock aria-hidden="true" className="h-5 w-5 shrink-0 text-gray-500" />
      </button>
      {open && !disabled && (
        <DropdownMenu anchorRef={triggerRef} id={popupId} role="dialog" label="Choose time" minWidth={272} maxWidth={320}
          onDismiss={close} className="overflow-y-auto p-3"
          onKeyDown={event => {
            if (event.key === 'Escape') {
              event.preventDefault(); event.stopPropagation(); close(); triggerRef.current?.focus({ preventScroll: true });
            }
          }}>
          <div className="flex items-end gap-2">
            <label className="w-16 text-xs font-medium text-gray-600">Hour
              <input ref={hourRef} inputMode="numeric" maxLength={2} value={hour} aria-invalid={!hourValid}
                onChange={event => setHour(event.target.value.replace(/\D/g, '').slice(0, 2))}
                onKeyDown={event => handleNumericKeyDown(event, 'hour')}
                onBlur={() => { if (hourValid) setHour(String(hourValue).padStart(2, '0')); }}
                className="mt-1 h-10 w-full rounded-lg border border-gray-300 px-2 text-center text-base" />
            </label>
            <span aria-hidden="true" className="mb-2 text-lg font-semibold text-gray-500">:</span>
            <label className="w-16 text-xs font-medium text-gray-600">Minute
              <input inputMode="numeric" maxLength={2} value={minute} aria-invalid={!minuteValid}
                onChange={event => setMinute(event.target.value.replace(/\D/g, '').slice(0, 2))}
                onKeyDown={event => handleNumericKeyDown(event, 'minute')}
                onBlur={() => { if (minuteValid) setMinute(String(minuteValue).padStart(2, '0')); }}
                className="mt-1 h-10 w-full rounded-lg border border-gray-300 px-2 text-center text-base" />
            </label>
            <div className="mb-0.5 ml-auto inline-flex h-10 overflow-hidden rounded-lg border border-gray-300" role="group" aria-label="AM or PM">
              {(['AM', 'PM'] as const).map(option => <button key={option} type="button" aria-pressed={period === option} onClick={() => setPeriod(option)}
                className={`min-w-10 px-2 text-sm font-semibold ${period === option ? 'bg-[#38A3A5] text-white' : 'bg-white text-gray-600 hover:bg-gray-100'}`}>{option}</button>)}
            </div>
          </div>
          {inputError && <p role="alert" className="mt-2 text-sm text-red-600">{inputError}</p>}
          <div className="mt-3 flex items-center justify-end gap-2 border-t border-gray-100 pt-2.5">
            {!required && <button type="button" disabled={!value}
              onClick={() => { setNativeValue(''); close(); triggerRef.current?.focus({ preventScroll: true }); }}
              className="min-h-9 rounded-lg px-3 text-sm font-medium text-gray-600 hover:bg-gray-100 disabled:opacity-40">Clear</button>}
            <button type="button" disabled={!!inputError}
              onClick={() => { setNativeValue(nextValue); close(); triggerRef.current?.focus({ preventScroll: true }); }}
              className="min-h-9 rounded-lg bg-[#38A3A5] px-4 text-sm font-semibold text-white hover:bg-[#2d8284] disabled:cursor-not-allowed disabled:opacity-50">Apply Time</button>
          </div>
        </DropdownMenu>
      )}
    </>
  );
}
