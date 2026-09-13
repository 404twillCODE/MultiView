import { AlertTriangle, X } from 'lucide-react';
import './InvalidUrlList.css';

export interface InvalidEntry {
  input: string;
  reason: string;
}

interface InvalidUrlListProps {
  entries: InvalidEntry[];
  onDismiss: () => void;
}

/** "Couldn't load" panel: shows exactly which pasted lines were rejected. */
export function InvalidUrlList({ entries, onDismiss }: InvalidUrlListProps) {
  if (entries.length === 0) return null;

  return (
    <div className="invalid-list" role="alert">
      <div className="invalid-list__header">
        <AlertTriangle size={15} className="invalid-list__icon" aria-hidden="true" />
        <h3 className="invalid-list__title">
          Couldn&rsquo;t load {entries.length} {entries.length === 1 ? 'link' : 'links'}
        </h3>
        <button
          type="button"
          className="btn btn--ghost btn--icon btn--sm"
          onClick={onDismiss}
          aria-label="Dismiss the list of links that could not be loaded"
        >
          <X size={14} aria-hidden="true" />
        </button>
      </div>
      <ul className="invalid-list__items">
        {entries.slice(0, 6).map((entry, index) => (
          <li className="invalid-list__item" key={`${entry.input}-${index}`}>
            <span className="invalid-list__url mono">{entry.input}</span>
            <span className="invalid-list__reason">{entry.reason}</span>
          </li>
        ))}
        {entries.length > 6 && (
          <li className="invalid-list__item invalid-list__item--more">
            +{entries.length - 6} more
          </li>
        )}
      </ul>
    </div>
  );
}
