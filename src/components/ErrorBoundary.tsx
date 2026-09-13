import { Component, type ErrorInfo, type ReactNode } from 'react';
import { clearSession } from '../utils/storage';
import './ErrorBoundary.css';

interface ErrorBoundaryState {
  error: Error | null;
}

/**
 * Last line of defence: a malformed saved session or a broken embed can never
 * leave the user staring at a blank page.
 */
export class ErrorBoundary extends Component<{ children: ReactNode }, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('MultiView crashed:', error, info.componentStack);
  }

  private reset = () => {
    this.setState({ error: null });
  };

  private resetAndClear = () => {
    clearSession();
    window.location.hash = '#/';
    window.location.reload();
  };

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    return (
      <div className="crash">
        <div className="crash__panel panel">
          <h1 className="crash__title">Something went wrong</h1>
          <p className="crash__text">
            MultiView hit an unexpected error. You can try again, or start from a clean session.
          </p>
          <pre className="crash__detail mono">{error.message}</pre>
          <div className="crash__actions">
            <button type="button" className="btn btn--primary" onClick={this.reset}>
              Try again
            </button>
            <button type="button" className="btn" onClick={this.resetAndClear}>
              Clear session and reload
            </button>
          </div>
        </div>
      </div>
    );
  }
}
