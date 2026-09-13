import { Columns3, LayoutGrid } from 'lucide-react';
import { useMediaQuery } from '../../hooks/useMediaQuery';
import type { LayoutMode } from '../../types';
import { Menu, MenuItem, MenuLabel } from '../ui/Menu';

const OPTIONS: { value: LayoutMode; label: string }[] = [
  { value: 'auto', label: 'Auto' },
  { value: '1', label: '1 column' },
  { value: '2', label: '2 columns' },
  { value: '3', label: '3 columns' },
  { value: '4', label: '4 columns' },
];

interface LayoutSelectorProps {
  layout: LayoutMode;
  onChange: (layout: LayoutMode) => void;
  /** Icon-only trigger, used when the toolbar is tight. */
  compact?: boolean;
}

/** Column-count picker. Multi-column options are hidden on phone widths. */
export function LayoutSelector({ layout, onChange, compact = false }: LayoutSelectorProps) {
  // Below this width the grid always falls back to a single column, so offering
  // 3 or 4 columns would be a lie.
  const isPhone = useMediaQuery('(max-width: 760px)');
  const options = isPhone ? OPTIONS.filter((option) => option.value === 'auto' || option.value === '1') : OPTIONS;
  const current = OPTIONS.find((option) => option.value === layout)?.label ?? 'Auto';

  return (
    <Menu
      triggerClassName={compact ? 'btn btn--icon' : 'btn'}
      triggerLabel="Change layout"
      iconOnly={compact}
      trigger={
        compact ? (
          <LayoutGrid size={16} aria-hidden="true" />
        ) : (
          <>
            <Columns3 size={16} aria-hidden="true" />
            Layout
            <span className="toolbar__value">{current}</span>
          </>
        )
      }
    >
      <MenuLabel>Columns</MenuLabel>
      {options.map((option) => (
        <MenuItem
          key={option.value}
          checked={layout === option.value}
          onSelect={() => onChange(option.value)}
        >
          {option.label}
        </MenuItem>
      ))}
      {isPhone && <MenuLabel>Wider screens unlock 2–4 columns</MenuLabel>}
    </Menu>
  );
}
