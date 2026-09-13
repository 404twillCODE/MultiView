import { ClipboardPaste } from 'lucide-react';
import { useId, useMemo, type ReactNode } from 'react';
import { useToast } from '../../context/ToastContext';
import { readClipboard } from '../../utils/share';
import { parseVideoList } from '../../utils/videoParser';
import './UrlInput.css';

interface UrlInputProps {
  value: string;
  onChange: (value: string) => void;
  /** Fired by Ctrl/Cmd+Enter. */
  onSubmit: () => void;
  label: string;
  rows?: number;
  autoFocus?: boolean;
  /** Buttons rendered at the end of the footer row. */
  actions?: ReactNode;
  /** Extra buttons rendered next to "Paste from Clipboard". */
  secondaryActions?: ReactNode;
}

const PLACEHOLDER = 'Paste video links here…\nOne link per line';

/**
 * The multiline URL field shared by the landing page and the "Add videos"
 * dialog, including live link counting and clipboard pasting.
 */
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
    const { videos, invalid } = parseVideoList(value);
    return { valid: videos.length, invalid: invalid.length };
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
              <strong>{summary.valid}</strong> {summary.valid === 1 ? 'link' : 'links'} detected
              {summary.invalid > 0 && (
                <span className="url-input__hint-warn"> · {summary.invalid} unrecognised</span>
              )}
            </>
          )}
        </p>

        <div className="url-input__actions">
          <button type="button" className="btn btn--sm" onClick={pasteFromClipboard}>
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
