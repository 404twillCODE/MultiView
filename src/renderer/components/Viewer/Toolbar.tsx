import {
  AudioLines,
  MoreHorizontal,
  Plus,
  RotateCw,
  Trash2,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import type { LayoutMode } from '../../../shared/ipc';
import { useMediaQuery } from '../../hooks/useMediaQuery';
import { Logo } from '../ui/Logo';
import { Menu, MenuItem, MenuSeparator } from '../ui/Menu';
import { LayoutSelector } from './LayoutSelector';
import './Toolbar.css';

interface ToolbarProps {
  count: number;
  layout: LayoutMode;
  onLayoutChange: (layout: LayoutMode) => void;
  allMuted: boolean;
  soloActive: boolean;
  onToggleMuteAll: () => void;
  onClearSolo: () => void;
  onReloadAll: () => void;
  onAddPanes: () => void;
  onClearAll: () => void;
}

export function Toolbar({
  count,
  layout,
  onLayoutChange,
  allMuted,
  soloActive,
  onToggleMuteAll,
  onClearSolo,
  onReloadAll,
  onAddPanes,
  onClearAll,
}: ToolbarProps) {
  const compact = useMediaQuery('(max-width: 940px)');

  return (
    <header className="toolbar">
      <div className="toolbar__brand">
        <Link to="/" className="toolbar__home" aria-label="MultiView home">
          <Logo />
        </Link>
        <span className="toolbar__count" aria-live="polite">
          {count} {count === 1 ? 'Pane' : 'Panes'}
        </span>
        {soloActive && (
          <button
            type="button"
            className="toolbar__solo btn btn--sm btn--active"
            onClick={onClearSolo}
            title="Clear solo audio"
          >
            <AudioLines size={14} aria-hidden="true" />
            Solo
          </button>
        )}
      </div>

      <div className="toolbar__actions">
        <button
          type="button"
          className="btn btn--primary"
          onClick={onAddPanes}
          aria-label="Add panes"
          title="Add panes (A)"
        >
          <Plus size={16} aria-hidden="true" />
          <span className="toolbar__label">Add</span>
        </button>

        <LayoutSelector layout={layout} onChange={onLayoutChange} compact={compact} />

        {compact ? (
          <Menu
            triggerClassName="btn btn--icon"
            triggerLabel="More actions"
            iconOnly
            trigger={<MoreHorizontal size={16} aria-hidden="true" />}
          >
            <MenuItem
              icon={allMuted ? <Volume2 size={15} /> : <VolumeX size={15} />}
              onSelect={onToggleMuteAll}
              disabled={count === 0}
            >
              {allMuted ? 'Unmute all' : 'Mute all'}
            </MenuItem>
            {soloActive && (
              <MenuItem icon={<AudioLines size={15} />} onSelect={onClearSolo}>
                Clear solo audio
              </MenuItem>
            )}
            <MenuItem icon={<RotateCw size={15} />} onSelect={onReloadAll} disabled={count === 0}>
              Reload all
            </MenuItem>
            <MenuSeparator />
            <MenuItem
              icon={<Trash2 size={15} />}
              tone="danger"
              onSelect={onClearAll}
              disabled={count === 0}
            >
              Clear all
            </MenuItem>
          </Menu>
        ) : (
          <>
            <button
              type="button"
              className={`btn ${allMuted ? 'btn--active' : ''}`}
              onClick={onToggleMuteAll}
              disabled={count === 0}
              aria-pressed={allMuted}
              aria-label={allMuted ? 'Unmute all panes' : 'Mute all panes'}
              title={allMuted ? 'Unmute all' : 'Mute all'}
            >
              {allMuted ? <Volume2 size={16} aria-hidden="true" /> : <VolumeX size={16} aria-hidden="true" />}
              <span className="toolbar__label">{allMuted ? 'Unmute All' : 'Mute All'}</span>
            </button>

            <button
              type="button"
              className="btn"
              onClick={onReloadAll}
              disabled={count === 0}
              aria-label="Reload all panes"
              title="Reload all"
            >
              <RotateCw size={16} aria-hidden="true" />
              <span className="toolbar__label">Reload All</span>
            </button>

            <button
              type="button"
              className="btn btn--danger"
              onClick={onClearAll}
              disabled={count === 0}
              aria-label="Clear all panes"
              title="Clear all"
            >
              <Trash2 size={16} aria-hidden="true" />
              <span className="toolbar__label">Clear All</span>
            </button>
          </>
        )}
      </div>
    </header>
  );
}
