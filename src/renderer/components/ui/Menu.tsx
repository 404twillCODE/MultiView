import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import './Menu.css';

interface MenuContextValue {
  close: () => void;
}

const MenuContext = createContext<MenuContextValue>({ close: () => {} });

interface MenuProps {
  /** Content of the trigger button. */
  trigger: ReactNode;
  triggerClassName?: string;
  triggerLabel: string;
  /** Show the trigger label as a tooltip too (icon-only triggers). */
  iconOnly?: boolean;
  align?: 'start' | 'end';
  children: ReactNode;
  onOpenChange?: (open: boolean) => void;
}

/**
 * Small popover menu: closes on outside click, Escape, or item activation, and
 * flips upwards when there is not enough room below.
 */
export function Menu({
  trigger,
  triggerClassName = 'btn',
  triggerLabel,
  iconOnly = false,
  align = 'end',
  children,
  onOpenChange,
}: MenuProps) {
  const [open, setOpen] = useState(false);
  const [flipUp, setFlipUp] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

  const setOpenState = useCallback(
    (next: boolean) => {
      setOpen(next);
      onOpenChange?.(next);
    },
    [onOpenChange],
  );

  const close = useCallback(() => setOpenState(false), [setOpenState]);

  useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: MouseEvent | TouchEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) close();
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        close();
      }
    };
    const onScrollOrResize = () => close();

    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('touchstart', onPointerDown);
    document.addEventListener('keydown', onKeyDown, true);
    window.addEventListener('resize', onScrollOrResize);

    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('touchstart', onPointerDown);
      document.removeEventListener('keydown', onKeyDown, true);
      window.removeEventListener('resize', onScrollOrResize);
    };
  }, [open, close]);

  // Decide the drop direction, then move focus into the menu.
  useEffect(() => {
    if (!open) return;
    const trigger = rootRef.current?.querySelector('button');
    const rect = trigger?.getBoundingClientRect();
    if (rect) setFlipUp(window.innerHeight - rect.bottom < 260 && rect.top > 260);

    const focusTimer = window.setTimeout(() => {
      listRef.current?.querySelector<HTMLElement>('[role="menuitem"], button')?.focus();
    }, 10);
    return () => window.clearTimeout(focusTimer);
  }, [open]);

  return (
    <div className="menu" ref={rootRef}>
      <button
        type="button"
        className={triggerClassName}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        aria-label={iconOnly ? triggerLabel : undefined}
        title={iconOnly ? triggerLabel : undefined}
        onClick={() => setOpenState(!open)}
      >
        {trigger}
      </button>

      {open && (
        <div
          className={`menu__list menu__list--${align} ${flipUp ? 'menu__list--up' : ''}`}
          id={menuId}
          role="menu"
          aria-label={triggerLabel}
          ref={listRef}
        >
          <MenuContext.Provider value={{ close }}>{children}</MenuContext.Provider>
        </div>
      )}
    </div>
  );
}

interface MenuItemProps {
  icon?: ReactNode;
  children: ReactNode;
  onSelect: () => void;
  tone?: 'default' | 'danger';
  disabled?: boolean;
  /** Renders a check on the right — used for single-choice groups. */
  checked?: boolean;
  hint?: string;
  /** Keep the menu open after activation (e.g. toggles). */
  keepOpen?: boolean;
}

export function MenuItem({
  icon,
  children,
  onSelect,
  tone = 'default',
  disabled = false,
  checked,
  hint,
  keepOpen = false,
}: MenuItemProps) {
  const { close } = useContext(MenuContext);

  return (
    <button
      type="button"
      role="menuitem"
      className={`menu__item ${tone === 'danger' ? 'menu__item--danger' : ''} ${
        checked ? 'menu__item--checked' : ''
      }`}
      disabled={disabled}
      aria-checked={checked === undefined ? undefined : checked}
      onClick={() => {
        onSelect();
        if (!keepOpen) close();
      }}
    >
      {icon && <span className="menu__item-icon">{icon}</span>}
      <span className="menu__item-label">{children}</span>
      {hint && <span className="menu__item-hint">{hint}</span>}
      {checked && <span className="menu__item-check" aria-hidden="true" />}
    </button>
  );
}

export function MenuLabel({ children }: { children: ReactNode }) {
  return <div className="menu__label">{children}</div>;
}

export function MenuSeparator() {
  return <div className="menu__separator" role="separator" />;
}

/** Escape hatch for custom rows such as the playback-speed chips. */
export function MenuRow({ children }: { children: ReactNode }) {
  return <div className="menu__row">{children}</div>;
}
