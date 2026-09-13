import { MonitorPlay, Plus } from 'lucide-react';
import { Link } from 'react-router-dom';
import './EmptyState.css';

interface EmptyStateProps {
  onAddVideos: () => void;
}

/** Shown on the viewer once every video has been removed. */
export function EmptyState({ onAddVideos }: EmptyStateProps) {
  return (
    <div className="empty">
      <div className="empty__inner">
        <span className="empty__icon" aria-hidden="true">
          <MonitorPlay size={26} />
        </span>
        <h2 className="empty__title">No videos open</h2>
        <p className="empty__text">
          Paste a few links and they will appear here side by side. Press{' '}
          <span className="kbd">A</span> any time to add more.
        </p>
        <div className="empty__actions">
          <button type="button" className="btn btn--primary btn--lg" onClick={onAddVideos}>
            <Plus size={17} aria-hidden="true" />
            Add Videos
          </button>
          <Link className="btn btn--lg" to="/">
            Back to start
          </Link>
        </div>
      </div>
    </div>
  );
}
