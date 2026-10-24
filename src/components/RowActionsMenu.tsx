import { useCallback, useId, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { MoreVerticalIcon } from 'lucide-react';
import { DropdownMenu } from './DropdownMenu';

export interface RowAction {
  key: string;
  label: string;
  icon: ReactNode;
  onSelect: () => void;
  destructive?: boolean;
}

interface RowActionsMenuProps {
  label: string;
  actions: RowAction[];
  disabled?: boolean;
  buttonClassName?: string;
  iconClassName?: string;
}

export function RowActionsMenu({ label, actions, disabled = false, buttonClassName = 'h-8 w-8', iconClassName = 'h-[18px] w-[18px]' }: RowActionsMenuProps) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

  const close = useCallback(() => setOpen(false), []);
  const closeAndFocus = useCallback(() => {
    setOpen(false);
    triggerRef.current?.focus();
  }, []);

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      closeAndFocus();
      return;
    }
    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;
    event.preventDefault();
    const items = Array.from(menuRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? []);
    const index = items.indexOf(document.activeElement as HTMLElement);
    const next = event.key === 'ArrowDown' ? (index + 1) % items.length : (index - 1 + items.length) % items.length;
    items[next]?.focus();
  };

  if (!actions.length) return null;

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        disabled={disabled}
        onClick={() => setOpen(value => !value)}
        className={`inline-flex shrink-0 items-center justify-center rounded-lg text-gray-500 transition-colors hover:bg-[#38A3A5]/10 hover:text-[#2d8284] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#38A3A5] disabled:cursor-not-allowed disabled:opacity-50 ${buttonClassName}`}
      >
        <MoreVerticalIcon aria-hidden="true" className={iconClassName} />
      </button>
      {open && (
        <DropdownMenu anchorRef={triggerRef} id={menuId} role="menu" label={label} width={160} onDismiss={close} onKeyDown={onKeyDown}>
          <div ref={menuRef} className="flex flex-col">
            {actions.map((action, index) => (
              <button
                key={action.key}
                type="button"
                role="menuitem"
                autoFocus={index === 0}
                onClick={() => { closeAndFocus(); action.onSelect(); }}
                className={`flex w-full items-center gap-2 whitespace-nowrap rounded-md px-3 py-2 text-left text-sm font-medium focus-visible:outline-none ${action.destructive ? 'text-red-600 hover:bg-red-50 focus-visible:bg-red-50' : 'text-gray-700 hover:bg-gray-50 focus-visible:bg-gray-50'}`}
              >
                {action.icon}
                {action.label}
              </button>
            ))}
          </div>
        </DropdownMenu>
      )}
    </>
  );
}
