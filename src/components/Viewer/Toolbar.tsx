import {
  MoreHorizontal,
  Plus,
  RotateCw,
  Share2,
  Trash2,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useMediaQuery } from '../../hooks/useMediaQuery';
import type { LayoutMode } from '../../types';
import { Logo } from '../ui/Logo';
import { Menu, MenuItem, MenuSeparator } from '../ui/Menu';
import { LayoutSelector } from './LayoutSelector';
import './Toolbar.css';

interface ToolbarProps {
  count: number;
  layout: LayoutMode;
  onLayoutChange: (layout: LayoutMode) => void;
  allMuted: boolean;
  canMuteAny: boolean;
  onToggleMuteAll: () => void;
  onReloadAll: () => void;
  onAddVideos: () => void;
  onClearAll: () => void;
  onShare: () => void;
}

/** Sticky global toolbar for the viewer. Collapses into a menu when narrow. */
export function Toolbar({
  count,
  layout,
  onLayoutChange,
  allMuted,
  canMuteAny,
  onToggleMuteAll,
  onReloadAll,
  onAddVideos,
  onClearAll,
  onShare,
}: ToolbarProps) {
  const compact = useMediaQuery('(max-width: 940px)');

  return (
    <header className="toolbar">
      <div className="toolbar__brand">
        <Link to="/" className="toolbar__home" aria-label="MultiView home — paste new links">
          <Logo />
        </Link>
        <span className="toolbar__count" aria-live="polite">
          {count} {count === 1 ? 'Video' : 'Videos'}
        </span>
      </div>

      <div className="toolbar__actions">
        {/* Labels collapse to icons on narrow screens, so every button keeps an
            explicit accessible name. */}
        <button
          type="button"
          className="btn btn--primary"
          onClick={onAddVideos}
          aria-label="Add videos"
          title="Add videos (A)"
        >
          <Plus size={16} aria-hidden="true" />
          <span className="toolbar__label">Add Videos</span>
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
              disabled={!canMuteAny}
            >
              {allMuted ? 'Unmute all' : 'Mute all'}
            </MenuItem>
            <MenuItem icon={<RotateCw size={15} />} onSelect={onReloadAll} disabled={count === 0}>
              Reload all
            </MenuItem>
            <MenuItem icon={<Share2 size={15} />} onSelect={onShare} disabled={count === 0}>
              Share session
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
              disabled={!canMuteAny}
              aria-pressed={allMuted}
              aria-label={allMuted ? 'Unmute all videos' : 'Mute all videos'}
              title={
                canMuteAny
                  ? 'Mute every player that exposes an official mute API'
                  : 'None of these players can be muted from outside their own controls'
              }
            >
              {allMuted ? <Volume2 size={16} aria-hidden="true" /> : <VolumeX size={16} aria-hidden="true" />}
              <span className="toolbar__label">{allMuted ? 'Unmute All' : 'Mute All'}</span>
            </button>

            <button
              type="button"
              className="btn"
              onClick={onReloadAll}
              disabled={count === 0}
              aria-label="Reload all videos"
              title="Reload all videos"
            >
              <RotateCw size={16} aria-hidden="true" />
              <span className="toolbar__label">Reload All</span>
            </button>

            <button
              type="button"
              className="btn"
              onClick={onShare}
              disabled={count === 0}
              aria-label="Copy a shareable link to this session"
              title="Copy a shareable link to this session"
            >
              <Share2 size={16} aria-hidden="true" />
              <span className="toolbar__label">Share</span>
            </button>

            <button
              type="button"
              className="btn btn--danger"
              onClick={onClearAll}
              disabled={count === 0}
              aria-label="Clear all videos"
              title="Clear all videos"
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
