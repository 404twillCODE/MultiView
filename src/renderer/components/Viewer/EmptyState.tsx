import { MonitorPlay, Plus } from 'lucide-react';
import { Link } from 'react-router-dom';
import './EmptyState.css';

interface EmptyStateProps {
  onAdd: () => void;
}

export function EmptyState({ onAdd }: EmptyStateProps) {
  return (
    <div className="empty">
      <div className="empty__inner">
        <span className="empty__icon" aria-hidden="true">
          <MonitorPlay size={26} />
        </span>
        <h2 className="empty__title">No panes open</h2>
        <p className="empty__text">
          Paste a few URLs and each one opens as its own interactive browser pane. Press{' '}
          <span className="kbd">A</span> any time to add more.
        </p>
        <div className="empty__actions">
          <button type="button" className="btn btn--primary btn--lg" onClick={onAdd}>
            <Plus size={17} aria-hidden="true" />
            Add Panes
          </button>
          <Link className="btn btn--lg" to="/">
            Back to start
          </Link>
        </div>
      </div>
    </div>
  );
}
