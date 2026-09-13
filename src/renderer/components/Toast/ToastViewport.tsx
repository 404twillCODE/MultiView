import { AlertTriangle, Check, Info, X } from 'lucide-react';
import type { ToastItem } from '../../context/ToastContext';
import './ToastViewport.css';

const ICONS = {
  info: Info,
  success: Check,
  error: AlertTriangle,
} as const;

interface ToastViewportProps {
  toasts: ToastItem[];
  onDismiss: (id: string) => void;
}

/** Bottom-right stack of subtle, self-dismissing messages. */
export function ToastViewport({ toasts, onDismiss }: ToastViewportProps) {
  return (
    <div className="toasts" role="region" aria-label="Notifications">
      <div className="toasts__stack" aria-live="polite" aria-atomic="false">
        {toasts.map((item) => {
          const Icon = ICONS[item.tone];
          return (
            <div key={item.id} className={`toast toast--${item.tone}`} role="status">
              <Icon className="toast__icon" size={16} aria-hidden="true" />
              <span className="toast__message">{item.message}</span>
              <button
                type="button"
                className="toast__close"
                onClick={() => onDismiss(item.id)}
                aria-label="Dismiss notification"
              >
                <X size={14} aria-hidden="true" />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
