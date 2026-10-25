import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState, type InputHTMLAttributes } from 'react';
import { Search } from 'lucide-react';
import { DropdownMenu } from '../DropdownMenu';
import { revealDropdownOption } from '../../utils/dropdown';
import type { Doctor } from '../../types/clinic';

interface DoctorSearchProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'onSelect' | 'onChange' | 'value' | 'defaultValue' | 'type'> {
  doctors: Doctor[];
  selectedDoctorIds: number[];
  onSelect: (doctor: Doctor) => void;
}

export function DoctorSearch({ doctors, selectedDoctorIds, onSelect, disabled, onBlur, onFocus, className = '', ...props }: DoctorSearchProps) {
  const listId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [active, setActive] = useState(0);
  const term = query.trim().toLocaleLowerCase();
  const available = doctors.filter(doctor => !selectedDoctorIds.includes(doctor.doctorId));
  const matches = term ? available.filter(doctor => doctor.name.toLocaleLowerCase().includes(term) || doctor.specialization.toLocaleLowerCase().includes(term)) : available;
  const open = showSuggestions && !disabled;
  const activeIndex = Math.min(active, matches.length - 1);
  const dismiss = useCallback(() => setShowSuggestions(false), []);

  useEffect(() => {
    if (disabled) dismiss();
  }, [disabled, dismiss]);

  useLayoutEffect(() => {
    const list = listRef.current;
    if (!open || !list) return;
    const revealActive = () => {
      const option = list.querySelector<HTMLElement>(`[data-doctor-option-index="${activeIndex}"]`);
      if (option) revealDropdownOption(list, option);
    };
    revealActive();
    const observer = new ResizeObserver(revealActive);
    observer.observe(list);
    return () => observer.disconnect();
  }, [activeIndex, open, term]);

  const choose = (doctor: Doctor) => {
    if (disabled) return;
    onSelect(doctor);
    setQuery('');
    setActive(0);
    setShowSuggestions(true);
    inputRef.current?.focus({ preventScroll: true });
  };

  return (
    <div className="relative">
      <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
      <input {...props} ref={inputRef} type="search" role="combobox" autoComplete="off" disabled={disabled}
        value={query} aria-autocomplete="list" aria-haspopup="listbox" aria-expanded={open}
        aria-controls={open ? listId : undefined} aria-activedescendant={open && activeIndex >= 0 ? `${listId}-${activeIndex}` : undefined}
        className={`h-11 w-full rounded-lg border border-gray-300 pl-9 pr-3 text-sm disabled:cursor-not-allowed disabled:opacity-60 ${className}`}
        onChange={event => { setQuery(event.target.value); setActive(0); setShowSuggestions(true); }}
        onFocus={event => { setShowSuggestions(true); onFocus?.(event); }}
        onClick={() => setShowSuggestions(true)}
        onBlur={event => {
          if (listRef.current?.contains(event.relatedTarget)) return;
          dismiss();
          onBlur?.(event);
        }}
        onKeyDown={event => {
          if (event.key === 'Escape' && open) {
            event.preventDefault(); event.stopPropagation(); dismiss();
          } else if (event.key === 'Tab') {
            dismiss();
          } else if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
            event.preventDefault();
            setShowSuggestions(true);
            setActive(index => !open ? 0 : Math.max(0, Math.min(matches.length - 1, index + (event.key === 'ArrowDown' ? 1 : -1))));
          } else if (event.key === 'Enter' && open) {
            event.preventDefault();
            if (matches[activeIndex]) choose(matches[activeIndex]);
          }
        }}
      />
      {open && (
        <DropdownMenu anchorRef={inputRef} onDismiss={dismiss}>
          <div ref={listRef} id={listId} role="listbox" aria-label="Matching doctors" className="arogya-dropdown-options">
            {matches.map((doctor, index) => (
              <button key={doctor.doctorId} id={`${listId}-${index}`} type="button" role="option" tabIndex={-1}
                aria-selected={index === activeIndex} data-doctor-option-index={index} title={`${doctor.name} — ${doctor.specialization}`}
                className={`arogya-dropdown-option w-full text-left ${index === activeIndex ? 'bg-[#e6f6f6]' : 'hover:bg-gray-50'}`}
                onPointerMove={() => setActive(index)}
                onMouseDown={event => event.preventDefault()} onClick={() => choose(doctor)}>
                <span className="min-w-0 flex-1">
                  <span translate="no" className="notranslate block truncate font-medium text-gray-900">{doctor.name}</span>
                  <span translate="no" className="notranslate block truncate text-xs text-gray-500">{doctor.specialization}</span>
                </span>
              </button>
            ))}
          </div>
          <p role="status" aria-live="polite" className={matches.length ? 'sr-only' : 'px-3 py-3 text-sm text-gray-500'}>
            {matches.length ? `${matches.length} available doctors` : term ? 'No matching available doctors' : 'All available doctors are already selected'}
          </p>
        </DropdownMenu>
      )}
    </div>
  );
}
