import {
  Children, Fragment, isValidElement, useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState,
  type KeyboardEvent, type ReactNode, type SelectHTMLAttributes,
} from 'react';
import { Check, ChevronDown, Search } from 'lucide-react';
import { DropdownMenu } from './DropdownMenu';
import { revealDropdownOption } from '../utils/dropdown';

interface SelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'multiple' | 'size'> {
  protectLabels?: boolean;
  searchable?: boolean;
  searchPlaceholder?: string;
}

interface Option {
  value: string;
  label: string;
  disabled: boolean;
}

function textContent(node: ReactNode): string {
  return Children.toArray(node).map(child => isValidElement<{ children?: ReactNode }>(child)
    ? textContent(child.props.children) : String(child)).join('');
}

function readOptions(children: ReactNode): Option[] {
  return Children.toArray(children).flatMap(child => {
    if (!isValidElement<{ children?: ReactNode; value?: string | number; disabled?: boolean; label?: string }>(child)) return [];
    if (child.type === Fragment) return readOptions(child.props.children);
    if (child.type !== 'option') return [];
    const label = child.props.label ?? textContent(child.props.children);
    return [{ value: String(child.props.value ?? label), label, disabled: !!child.props.disabled }];
  });
}

export function Select({
  children, className = '', value, defaultValue, id, disabled, required, name, form,
  onChange, onBlur, searchable = false, searchPlaceholder = 'Search options...', protectLabels = false, ...props
}: SelectProps) {
  const generatedId = useId();
  const controlId = id ?? generatedId;
  const menuId = `${controlId}-options`;
  const nativeRef = useRef<HTMLSelectElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const optionsRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const openRef = useRef(false);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(-1);
  const [uncontrolledValue, setUncontrolledValue] = useState(defaultValue);
  const typeahead = useRef({ text: '', time: 0 });
  const options = useMemo(() => readOptions(children), [children]);
  const currentValue = value ?? uncontrolledValue;
  const selected = options.find(option => option.value === String(currentValue)) ?? (currentValue === undefined ? options[0] : undefined);
  const menuOptions = useMemo(() => options.filter(option => !(option.disabled && option.value === '')), [options]);
  const filtered = useMemo(() => menuOptions.filter(option => option.label.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase())), [menuOptions, query]);
  const close = useCallback(() => {
    if (!openRef.current) return;
    openRef.current = false;
    setOpen(false);
    setQuery('');
    window.requestAnimationFrame(() => nativeRef.current?.dispatchEvent(new FocusEvent('focusout', { bubbles: true })));
  }, []);

  const openMenu = () => {
    if (disabled) return;
    setQuery('');
    const selectedIndex = menuOptions.findIndex(option => option.value === selected?.value && !option.disabled);
    setActive(selectedIndex >= 0 ? selectedIndex : menuOptions.findIndex(option => !option.disabled));
    openRef.current = true;
    setOpen(true);
  };

  useEffect(() => {
    if (disabled) close();
  }, [close, disabled]);

  useEffect(() => {
    if (open && searchable) searchRef.current?.focus({ preventScroll: true });
  }, [open, searchable]);

  useLayoutEffect(() => {
    const list = optionsRef.current;
    if (!open || !list) return;
    const revealActiveOption = () => {
      const option = list.querySelector<HTMLElement>(`[data-option-index="${active}"]`);
      if (option) revealDropdownOption(list, option);
    };
    revealActiveOption();
    const observer = new ResizeObserver(revealActiveOption);
    observer.observe(list);
    return () => observer.disconnect();
  }, [active, open, query]);

  useEffect(() => {
    if (open && (!filtered[active] || filtered[active].disabled)) setActive(filtered.findIndex(option => !option.disabled));
  }, [active, filtered, open]);

  const select = (option: Option) => {
    if (option.disabled || disabled || !nativeRef.current) return;
    nativeRef.current.value = option.value;
    nativeRef.current.dispatchEvent(new Event('change', { bubbles: true }));
    close();
    triggerRef.current?.focus({ preventScroll: true });
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (event.key === 'Escape' && open) {
      event.preventDefault(); event.stopPropagation(); close(); triggerRef.current?.focus({ preventScroll: true });
    } else if (event.key === 'Tab') {
      if (event.target === searchRef.current) triggerRef.current?.focus({ preventScroll: true });
      close();
    } else if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) {
      event.preventDefault();
      if (!open) { openMenu(); return; }
      const direction = event.key === 'ArrowUp' || event.key === 'End' ? -1 : 1;
      let next = event.key === 'Home' ? 0 : event.key === 'End' ? filtered.length - 1 : active + direction;
      while (next >= 0 && next < filtered.length && filtered[next].disabled) next += direction;
      if (next >= 0 && next < filtered.length) setActive(next);
    } else if ((event.key === 'Enter' || event.key === ' ') && event.target !== searchRef.current) {
      event.preventDefault();
      if (open && filtered[active]) select(filtered[active]);
      else openMenu();
    } else if (event.key === 'Enter' && open) {
      event.preventDefault();
      if (filtered[active]) select(filtered[active]);
    } else if (!searchable && event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
      event.preventDefault();
      const now = Date.now();
      const text = (now - typeahead.current.time < 700 ? typeahead.current.text : '') + event.key.toLocaleLowerCase();
      typeahead.current = { text, time: now };
      const next = filtered.findIndex(option => !option.disabled && option.label.toLocaleLowerCase().startsWith(text));
      if (!open) openMenu();
      if (next >= 0) setActive(next);
    }
  };

  const accessibleName = props['aria-label']
    ?? (Array.from(triggerRef.current?.labels ?? []).map(label => label.textContent).join(' ').trim() || name || 'Options');
  const activeId = open && filtered[active] ? `${menuId}-${active}` : undefined;

  return (
    <>
      <select {...props} ref={nativeRef} id={`${controlId}-native`} name={name} form={form}
        value={value} defaultValue={defaultValue} disabled={disabled} required={required}
        tabIndex={-1} aria-hidden="true" className="sr-only"
        onFocus={() => triggerRef.current?.focus({ preventScroll: true })}
        onInvalid={event => { props.onInvalid?.(event); event.preventDefault(); triggerRef.current?.focus(); }}
        onBlur={onBlur}
        onChange={event => { setUncontrolledValue(event.target.value); onChange?.(event); }}>
        {children}
      </select>
      <button ref={triggerRef} id={controlId} type="button" role="combobox" disabled={disabled}
        aria-expanded={open} aria-haspopup="listbox" aria-controls={open ? menuId : undefined}
        aria-activedescendant={!searchable ? activeId : undefined} aria-required={required}
        aria-invalid={props['aria-invalid']} aria-describedby={props['aria-describedby']}
        aria-label={props['aria-label']} aria-labelledby={props['aria-labelledby']} title={selected?.label}
        className={`arogya-select-trigger ${className}`}
        onClick={() => open ? close() : openMenu()} onKeyDown={handleKeyDown}
        onBlur={() => { if (!open) nativeRef.current?.dispatchEvent(new FocusEvent('focusout', { bubbles: true })); }}>
        <span translate={protectLabels && selected && selected.value !== '' ? 'no' : undefined} className={`min-w-0 flex-1 truncate text-left${protectLabels && selected && selected.value !== '' ? ' notranslate' : ''}`}>{selected?.label ?? 'Select an option'}</span>
        <ChevronDown aria-hidden="true" className={`h-4 w-4 shrink-0 text-gray-500 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && !disabled && (
        <DropdownMenu anchorRef={triggerRef} onDismiss={close}>
          {searchable && (
            <div className="relative m-1 shrink-0">
              <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input ref={searchRef} type="search" role="combobox" aria-expanded="true" aria-controls={menuId}
                aria-autocomplete="list" aria-activedescendant={activeId} aria-label={`Search ${accessibleName}`}
                placeholder={searchPlaceholder} value={query} onChange={event => { setQuery(event.target.value); setActive(0); }}
                onKeyDown={handleKeyDown} className="h-10 w-full rounded-lg border border-gray-300 pl-9 pr-3 text-sm" />
            </div>
          )}
          <div ref={optionsRef} id={menuId} role="listbox" aria-label={accessibleName} className="arogya-dropdown-options">
            {filtered.map((option, index) => (
              <div key={option.value} id={`${menuId}-${index}`} role="option" aria-selected={selected?.value === option.value}
                aria-disabled={option.disabled} data-option-index={index} title={option.label}
                className={`arogya-dropdown-option ${selected?.value === option.value ? 'bg-[#38A3A5] text-white' : index === active ? 'bg-[#e6f6f6] text-gray-900' : 'text-gray-700'}`}
                onPointerMove={() => { if (!option.disabled) setActive(index); }}
                onPointerDown={event => { if (event.pointerType === 'mouse') event.preventDefault(); }} onClick={() => select(option)}>
                <span translate={protectLabels && option.value !== '' ? 'no' : undefined} className={`min-w-0 flex-1 truncate${protectLabels && option.value !== '' ? ' notranslate' : ''}`}>{option.label}</span>
                {selected?.value === option.value && <Check aria-hidden="true" className="h-4 w-4 shrink-0" />}
              </div>
            ))}
          </div>
          <span className={filtered.length ? 'sr-only' : 'px-3 py-3 text-sm text-gray-500'} role="status" aria-live="polite">
            {filtered.length ? searchable ? `${filtered.length} options available` : '' : 'No options found'}
          </span>
        </DropdownMenu>
      )}
    </>
  );
}
