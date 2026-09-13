import { ArrowRight, History, Play, Trash2 } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { InvalidUrlList, type InvalidEntry } from '../components/UrlInput/InvalidUrlList';
import { UrlInput } from '../components/UrlInput/UrlInput';
import { Logo } from '../components/ui/Logo';
import { useToast } from '../context/ToastContext';
import { useVideoStore } from '../context/VideoStore';
import { loadDraft, saveDraft, storageAvailable } from '../utils/storage';
import './LandingPage.css';

const SUPPORTED = ['YouTube', 'Vimeo', 'Twitch', 'Dailymotion', 'MP4 / WebM', 'any embeddable page'];

/** Module scoped so the "links restored" toast appears once per page load. */
let announcedRestore = false;

/** Page 1 — paste links, open the wall. */
export function LandingPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { openFromText, count } = useVideoStore();

  const [text, setText] = useState(() => loadDraft());
  const [invalid, setInvalid] = useState<InvalidEntry[]>([]);

  // Persist the draft so a reload never loses what was typed.
  useEffect(() => {
    saveDraft(text);
  }, [text]);

  // Tell the user once that their previous links came back — or that this
  // browser refuses to remember them at all (private mode, blocked storage).
  useEffect(() => {
    if (announcedRestore) return;
    announcedRestore = true;
    if (!storageAvailable) {
      toast("This browser blocks local storage, so links won't be remembered", 'info');
      return;
    }
    if (loadDraft().trim()) toast('Links restored from your last visit', 'info');
  }, [toast]);

  const openVideos = useCallback(() => {
    if (!text.trim()) {
      toast('Paste at least one video link first', 'error');
      return;
    }

    const result = openFromText(text);
    setInvalid(result.invalid);

    if (result.added.length === 0) {
      toast("None of those links could be opened — check the 'Couldn't load' list", 'error');
      return;
    }

    toast(
      `${result.added.length} ${result.added.length === 1 ? 'video' : 'videos'} opened`,
      'success',
    );
    navigate('/watch');
  }, [text, openFromText, navigate, toast]);

  /**
   * Clears the textarea and the saved draft. Videos already open are left alone —
   * closing those is the viewer's "Clear All".
   */
  function clear() {
    setText('');
    setInvalid([]);
    saveDraft('');
    toast('Cleared saved links', 'info');
  }

  return (
    <main className="landing">
      <div className="landing__inner">
        <header className="landing__header">
          <Logo size="lg" />
          <p className="landing__tagline">Watch multiple videos at once.</p>
        </header>

        <section className="landing__panel panel" aria-label="Video links">
          <UrlInput
            value={text}
            onChange={setText}
            onSubmit={openVideos}
            label="Video links, one per line"
            autoFocus
            rows={8}
            secondaryActions={
              text.trim() ? (
                <button type="button" className="btn btn--ghost btn--sm" onClick={clear}>
                  <Trash2 size={15} aria-hidden="true" />
                  Clear
                </button>
              ) : null
            }
            actions={
              <button type="button" className="btn btn--primary" onClick={openVideos}>
                <Play size={16} aria-hidden="true" />
                Open Videos
              </button>
            }
          />

          {invalid.length > 0 && (
            <div className="landing__invalid">
              <InvalidUrlList entries={invalid} onDismiss={() => setInvalid([])} />
            </div>
          )}
        </section>

        {count > 0 && (
          <button type="button" className="landing__resume" onClick={() => navigate('/watch')}>
            <History size={16} aria-hidden="true" />
            <span className="landing__resume-text">
              Continue previous session
              <span className="landing__resume-meta">
                {count} {count === 1 ? 'video' : 'videos'} still open
              </span>
            </span>
            <ArrowRight size={16} aria-hidden="true" className="landing__resume-arrow" />
          </button>
        )}

        <footer className="landing__footer">
          <ul className="landing__supported">
            {SUPPORTED.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
          <p className="landing__note">
            Everything stays in your browser — no account, no uploads, no server.
          </p>
        </footer>
      </div>
    </main>
  );
}
