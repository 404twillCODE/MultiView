import { ClipboardPaste } from 'lucide-react';
import { useId, useMemo, type ReactNode } from 'react';
import { parseUrlList } from '../../../shared/urls';
import { useToast } from '../../context/ToastContext';
import { readClipboard } from '../../lib/clipboard';
import './UrlInput.css';

interface UrlInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  label: string;
  rows?: number;
  autoFocus?: boolean;
  actions?: ReactNode;
  secondaryActions?: ReactNode;
}

const PLACEHOLDER = 'Paste URLs here…\nOne URL per line';

/** Multiline URL field with live counting and clipboard paste. */
export function UrlInput({
  value,
  onChange,
  onSubmit,
  label,
  rows = 7,
  autoFocus = false,
  actions,
  secondaryActions,
}: UrlInputProps) {
  const { toast } = useToast();
  const textareaId = useId();
  const hintId = useId();

  const summary = useMemo(() => {
    if (!value.trim()) return { valid: 0, invalid: 0 };
    const { urls, invalid } = parseUrlList(value);
    return { valid: urls.length, invalid: invalid.length };
  }, [value]);

  async function pasteFromClipboard() {
    const text = await readClipboard();
    if (text === null) {
      toast('Clipboard access is unavailable — paste with Ctrl/Cmd+V instead', 'error');
      return;
    }
    if (!text.trim()) {
      toast('Clipboard is empty', 'info');
      return;
    }
    const next = value.trim() ? `${value.replace(/\s+$/, '')}\n${text.trim()}` : text.trim();
    onChange(next);
    toast('Pasted from clipboard', 'success');
  }

  return (
    <div className="url-input">
      <label className="sr-only" htmlFor={textareaId}>
        {label}
      </label>
      <textarea
        id={textareaId}
        className="url-input__field mono"
        value={value}
        rows={rows}
        spellCheck={false}
        autoCapitalize="off"
        autoCorrect="off"
        aria-describedby={hintId}
        placeholder={PLACEHOLDER}
        autoFocus={autoFocus}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={(event) => {
          if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
            event.preventDefault();
            onSubmit();
          }
        }}
      />

      <div className="url-input__footer">
        <p className="url-input__hint" id={hintId}>
          {summary.valid === 0 && summary.invalid === 0 ? (
            <>
              Press <span className="kbd">⌘/Ctrl</span> <span className="kbd">↵</span> to open
            </>
          ) : (
            <>
              <strong>{summary.valid}</strong> {summary.valid === 1 ? 'URL' : 'URLs'} detected
              {summary.invalid > 0 && (
                <span className="url-input__hint-warn"> · {summary.invalid} unrecognised</span>
              )}
            </>
          )}
        </p>

        <div className="url-input__actions">
          <button type="button" className="btn btn--sm" onClick={() => void pasteFromClipboard()}>
            <ClipboardPaste size={15} aria-hidden="true" />
            Paste from Clipboard
          </button>
          {secondaryActions}
          {actions}
        </div>
      </div>
    </div>
  );
}
