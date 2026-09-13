import { ArrowRight, History, Monitor, Play, Trash2 } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { InvalidUrlList, type InvalidEntry } from '../components/UrlInput/InvalidUrlList';
import { UrlInput } from '../components/UrlInput/UrlInput';
import { Logo } from '../components/ui/Logo';
import { useToast } from '../context/ToastContext';
import { usePaneStore } from '../context/PaneStore';
import { setOverlayOpen } from '../lib/api';

const DRAFT_KEY = 'multiview:draft';

function loadDraft(): string {
  try {
    return localStorage.getItem(DRAFT_KEY) ?? '';
  } catch {
    return '';
  }
}

function saveDraft(text: string): void {
  try {
    if (!text.trim()) localStorage.removeItem(DRAFT_KEY);
    else localStorage.setItem(DRAFT_KEY, text);
  } catch {
    /* ignore */
  }
}

let announcedRestore = false;

const SUPPORTED = [
  'YouTube',
  'Twitch',
  'news sites',
  'dashboards',
  'any website',
  'direct video files',
];

/** Landing — paste URLs, open a wall of real browser panes. */
export function LandingPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const {
    openFromText,
    count,
    ready,
    isElectron,
    hasSavedSession,
    continueSession,
    dismissSavedSession,
  } = usePaneStore();

  const [text, setText] = useState(() => loadDraft());
  const [invalid, setInvalid] = useState<InvalidEntry[]>([]);

  useEffect(() => {
    saveDraft(text);
  }, [text]);

  // Landing sits on top of any still-alive guest views — park them off-screen.
  useEffect(() => {
    void setOverlayOpen(true);
    return () => {
      void setOverlayOpen(false);
    };
  }, []);

  useEffect(() => {
    if (announcedRestore || !ready) return;
    announcedRestore = true;
    if (loadDraft().trim()) toast('Links restored from your last visit', 'info');
  }, [ready, toast]);

  const openPanes = useCallback(async () => {
    if (!isElectron) {
      toast('MultiView is a desktop app — run npm run electron:dev', 'error');
      return;
    }
    if (!text.trim()) {
      toast('Paste at least one URL first', 'error');
      return;
    }

    const result = await openFromText(text);
    setInvalid(result.invalid);

    if (result.added === 0) {
      toast("None of those URLs could be opened — check the 'Couldn't load' list", 'error');
      return;
    }

    toast(`${result.added} ${result.added === 1 ? 'pane' : 'panes'} opened`, 'success');
    navigate('/watch');
  }, [text, openFromText, navigate, toast, isElectron]);

  function clear() {
    setText('');
    setInvalid([]);
    saveDraft('');
    toast('Cleared saved links', 'info');
  }

  async function resume() {
    if (count > 0) {
      navigate('/watch');
      return;
    }
    const ok = await continueSession();
    if (ok) {
      toast('Previous session restored', 'success');
      navigate('/watch');
    } else {
      toast('No saved session found', 'info');
      await dismissSavedSession();
    }
  }

  return (
    <main className="landing">
      <div className="landing__inner">
        <header className="landing__header">
          <Logo size="lg" />
          <p className="landing__tagline">Watch multiple websites and videos at once.</p>
        </header>

        {!isElectron && ready && (
          <div className="landing__electron-needed panel" role="status">
            <Monitor size={18} aria-hidden="true" />
            <div>
              <strong>Desktop app required</strong>
              <p>
                MultiView opens real browser panes with Electron — iframes can&rsquo;t do this.
                From the project folder run <span className="kbd">npm run electron:dev</span>.
              </p>
            </div>
          </div>
        )}

        <section className="landing__panel panel" aria-label="URLs">
          <UrlInput
            value={text}
            onChange={setText}
            onSubmit={() => void openPanes()}
            label="URLs, one per line"
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
              <button
                type="button"
                className="btn btn--primary"
                onClick={() => void openPanes()}
                disabled={!isElectron}
              >
                <Play size={16} aria-hidden="true" />
                Open
              </button>
            }
          />

          {invalid.length > 0 && (
            <div className="landing__invalid">
              <InvalidUrlList entries={invalid} onDismiss={() => setInvalid([])} />
            </div>
          )}
        </section>

        {(count > 0 || hasSavedSession) && (
          <button type="button" className="landing__resume" onClick={() => void resume()}>
            <History size={16} aria-hidden="true" />
            <span className="landing__resume-text">
              Continue previous session
              <span className="landing__resume-meta">
                {count > 0
                  ? `${count} ${count === 1 ? 'pane' : 'panes'} still open`
                  : 'Restore your last wall of panes'}
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
            Each pane is a real browser — click, scroll, play, and navigate freely.
          </p>
        </footer>
      </div>
    </main>
  );
}
