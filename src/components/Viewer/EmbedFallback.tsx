import { ExternalLink, RotateCw, ShieldAlert } from 'lucide-react';
import './EmbedFallback.css';

interface EmbedFallbackProps {
  title: string;
  message: string;
  url: string;
  /** Optional retry — offered when the embed merely timed out. */
  onRetry?: () => void;
  /** Dimmed variant shown on top of a frame that may still load. */
  overlay?: boolean;
  onDismiss?: () => void;
}

/**
 * Honest fallback for content that cannot be framed.
 *
 * Browsers deliberately block embedding when a site sends `X-Frame-Options` or a
 * `frame-ancestors` CSP, and nothing client-side can (or should) work around
 * that — so we explain it and link out instead.
 */
export function EmbedFallback({
  title,
  message,
  url,
  onRetry,
  overlay = false,
  onDismiss,
}: EmbedFallbackProps) {
  return (
    <div className={`embed-fallback ${overlay ? 'embed-fallback--overlay' : ''}`}>
      <div className="embed-fallback__inner">
        <span className="embed-fallback__badge" aria-hidden="true">
          <ShieldAlert size={18} />
        </span>
        <h3 className="embed-fallback__title">{title}</h3>
        <p className="embed-fallback__message">{message}</p>
        <div className="embed-fallback__actions">
          <a
            className="btn btn--primary btn--sm"
            href={url}
            target="_blank"
            rel="noreferrer noopener"
          >
            <ExternalLink size={14} aria-hidden="true" />
            Open Original Link
          </a>
          {onRetry && (
            <button type="button" className="btn btn--sm" onClick={onRetry}>
              <RotateCw size={14} aria-hidden="true" />
              Try again
            </button>
          )}
          {onDismiss && (
            <button type="button" className="btn btn--ghost btn--sm" onClick={onDismiss}>
              Keep waiting
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
