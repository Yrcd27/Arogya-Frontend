import { useLayoutEffect, useRef, useState, type CSSProperties, type KeyboardEventHandler, type ReactNode, type RefObject } from 'react';
import { createPortal } from 'react-dom';

interface DropdownMenuProps {
  anchorRef: RefObject<HTMLElement>;
  children: ReactNode;
  onDismiss: () => void;
  id?: string;
  role?: 'listbox' | 'menu';
  label?: string;
  width?: number;
  className?: string;
  onKeyDown?: KeyboardEventHandler<HTMLDivElement>;
}

export function DropdownMenu({ anchorRef, children, onDismiss, id, role, label, width, className = '', onKeyDown }: DropdownMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<CSSProperties>({ position: 'fixed', top: 0, left: 0, visibility: 'hidden' });
  const anchor = anchorRef.current;
  const host = anchor?.closest('dialog[open]') ?? document.body;

  useLayoutEffect(() => {
    const anchor = anchorRef.current;
    const menu = menuRef.current;
    if (!anchor || !menu) return;
    const place = () => {
      const rect = anchor.getBoundingClientRect();
      const viewport = window.visualViewport;
      const viewportTop = viewport?.offsetTop ?? 0;
      const viewportLeft = viewport?.offsetLeft ?? 0;
      const viewportWidth = viewport?.width ?? document.documentElement.clientWidth;
      const viewportHeight = viewport?.height ?? window.innerHeight;
      const below = viewportTop + viewportHeight - rect.bottom - 12;
      const above = rect.top - viewportTop - 12;
      const desiredHeight = menu.scrollHeight;
      const upward = below < desiredHeight && above > below;
      const available = Math.max(0, upward ? above : below);
      const menuWidth = Math.min(width ?? rect.width, viewportWidth - 16);
      setPosition({
        position: 'fixed', width: menuWidth,
        left: Math.max(viewportLeft + 8, Math.min(width ? rect.right - menuWidth : rect.left, viewportLeft + viewportWidth - menuWidth - 8)),
        top: upward ? Math.max(viewportTop + 8, rect.top - Math.min(desiredHeight, available) - 4) : rect.bottom + 4,
        maxHeight: available, visibility: 'visible',
      });
    };
    place();
    const observer = new ResizeObserver(place);
    observer.observe(anchor);
    observer.observe(menu);
    const outside = (event: PointerEvent) => {
      if (!anchor.contains(event.target as Node) && !menu.contains(event.target as Node)) onDismiss();
    };
    document.addEventListener('pointerdown', outside, true);
    window.addEventListener('resize', place);
    document.addEventListener('scroll', place, true);
    window.visualViewport?.addEventListener('resize', place);
    window.visualViewport?.addEventListener('scroll', place);
    return () => {
      observer.disconnect();
      document.removeEventListener('pointerdown', outside, true);
      window.removeEventListener('resize', place);
      document.removeEventListener('scroll', place, true);
      window.visualViewport?.removeEventListener('resize', place);
      window.visualViewport?.removeEventListener('scroll', place);
    };
  }, [anchorRef, onDismiss, width]);

  return createPortal(
    <div ref={menuRef} id={id} role={role} aria-label={label} style={position} onKeyDown={onKeyDown}
      className={`arogya-dropdown-menu z-[9999] flex min-h-0 flex-col overflow-hidden rounded-lg border border-gray-200 bg-white p-1 text-gray-900 shadow-lg ${className}`}>
      {children}
    </div>, host,
  );
}
