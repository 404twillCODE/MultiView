import { Plus } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useToast } from '../../context/ToastContext';
import { useVideoStore } from '../../context/VideoStore';
import { InvalidUrlList, type InvalidEntry } from '../UrlInput/InvalidUrlList';
import { UrlInput } from '../UrlInput/UrlInput';
import { Modal } from '../ui/Modal';
import './AddVideosModal.css';

interface AddVideosModalProps {
  open: boolean;
  onClose: () => void;
}

/**
 * Adds URLs to the existing wall. Nothing already playing is touched, and
 * duplicates are reported rather than silently dropped.
 */
export function AddVideosModal({ open, onClose }: AddVideosModalProps) {
  const { addFromText } = useVideoStore();
  const { toast } = useToast();
  const [text, setText] = useState('');
  const [invalid, setInvalid] = useState<InvalidEntry[]>([]);

  // Start from a clean sheet every time the dialog opens.
  useEffect(() => {
    if (open) {
      setText('');
      setInvalid([]);
    }
  }, [open]);

  function submit() {
    if (!text.trim()) {
      toast('Paste at least one link', 'error');
      return;
    }

    const { added, duplicates, invalid: rejected } = addFromText(text);
    setInvalid(rejected);

    if (added.length > 0) {
      toast(`${added.length} ${added.length === 1 ? 'video' : 'videos'} added`, 'success');
      if (duplicates > 0) {
        toast(
          duplicates === 1 ? 'Video already open' : `${duplicates} videos were already open`,
          'info',
        );
      }
      onClose();
      return;
    }

    if (duplicates > 0) {
      toast(duplicates === 1 ? 'Video already open' : `All ${duplicates} videos are already open`, 'info');
      if (rejected.length === 0) onClose();
      return;
    }

    toast('No usable links found', 'error');
  }

  return (
    <Modal
      open={open}
      title="Add videos"
      description="Paste one link per line. Existing videos keep playing."
      onClose={onClose}
      footer={
        <>
          <p className="add-videos__hint">
            <span className="kbd">⌘/Ctrl</span> <span className="kbd">↵</span> to add
          </p>
          <div className="add-videos__buttons">
            <button type="button" className="btn" onClick={onClose}>
              Cancel
            </button>
            <button type="button" className="btn btn--primary" onClick={submit}>
              <Plus size={16} aria-hidden="true" />
              Add
            </button>
          </div>
        </>
      }
    >
      <UrlInput
        value={text}
        onChange={setText}
        onSubmit={submit}
        label="Additional video links, one per line"
        rows={6}
        autoFocus
      />
      {invalid.length > 0 && (
        <div className="add-videos__invalid">
          <InvalidUrlList entries={invalid} onDismiss={() => setInvalid([])} />
        </div>
      )}
    </Modal>
  );
}
