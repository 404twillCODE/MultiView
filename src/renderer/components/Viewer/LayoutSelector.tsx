import {
  Columns3,
  LayoutGrid,
} from 'lucide-react';
import { useMediaQuery } from '../../hooks/useMediaQuery';
import type { LayoutMode } from '../../../shared/ipc';
import { Menu, MenuItem, MenuLabel } from '../ui/Menu';

const OPTIONS: { value: LayoutMode; label: string; group: string }[] = [
  { value: 'auto', label: 'Auto', group: 'Smart' },
  { value: '1', label: '1 column', group: 'Columns' },
  { value: '2', label: '2 columns', group: 'Columns' },
  { value: '3', label: '3 columns', group: 'Columns' },
  { value: '4', label: '4 columns', group: 'Columns' },
  { value: '2x2', label: '2 × 2', group: 'Grids' },
  { value: '3x2', label: '3 × 2', group: 'Grids' },
  { value: '3x3', label: '3 × 3', group: 'Grids' },
];

interface LayoutSelectorProps {
  layout: LayoutMode;
  onChange: (layout: LayoutMode) => void;
  compact?: boolean;
}

export function LayoutSelector({ layout, onChange, compact = false }: LayoutSelectorProps) {
  const isPhone = useMediaQuery('(max-width: 760px)');
  const options = isPhone
    ? OPTIONS.filter((option) => option.value === 'auto' || option.value === '1')
    : OPTIONS;
  const current = OPTIONS.find((option) => option.value === layout)?.label ?? 'Auto';
  const groups = [...new Set(options.map((option) => option.group))];

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
      {groups.map((group) => (
        <div key={group}>
          <MenuLabel>{group}</MenuLabel>
          {options
            .filter((option) => option.group === group)
            .map((option) => (
              <MenuItem
                key={option.value}
                checked={layout === option.value}
                onSelect={() => onChange(option.value)}
              >
                {option.label}
              </MenuItem>
            ))}
        </div>
      ))}
      {isPhone && <MenuLabel>Wider screens unlock more layouts</MenuLabel>}
    </Menu>
  );
}
