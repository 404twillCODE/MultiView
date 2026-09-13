import { Plus } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useToast } from '../../context/ToastContext';
import { usePaneStore } from '../../context/PaneStore';
import { InvalidUrlList, type InvalidEntry } from '../UrlInput/InvalidUrlList';
import { UrlInput } from '../UrlInput/UrlInput';
import { Modal } from '../ui/Modal';
import './AddVideosModal.css';

interface AddPanesModalProps {
  open: boolean;
  onClose: () => void;
}

export function AddPanesModal({ open, onClose }: AddPanesModalProps) {
  const { addFromText } = usePaneStore();
  const { toast } = useToast();
  const [text, setText] = useState('');
  const [invalid, setInvalid] = useState<InvalidEntry[]>([]);

  useEffect(() => {
    if (open) {
      setText('');
      setInvalid([]);
    }
  }, [open]);

  async function submit() {
    if (!text.trim()) {
      toast('Paste at least one URL', 'error');
      return;
    }

    const { added, duplicates, invalid: rejected } = await addFromText(text);
    setInvalid(rejected);

    if (added > 0) {
      toast(`${added} ${added === 1 ? 'pane' : 'panes'} added`, 'success');
      if (duplicates > 0) {
        toast(duplicates === 1 ? 'Pane already open' : `${duplicates} panes were already open`, 'info');
      }
      onClose();
      return;
    }

    if (duplicates > 0) {
      toast(duplicates === 1 ? 'Pane already open' : `All ${duplicates} panes are already open`, 'info');
      if (rejected.length === 0) onClose();
      return;
    }

    toast('No usable URLs found', 'error');
  }

  return (
    <Modal
      open={open}
      title="Add panes"
      description="Paste one URL per line. Existing panes keep running."
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
            <button type="button" className="btn btn--primary" onClick={() => void submit()}>
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
        onSubmit={() => void submit()}
        label="Additional URLs, one per line"
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
