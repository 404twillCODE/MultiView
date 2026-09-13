import { HashRouter, Navigate, Route, Routes } from 'react-router-dom';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ToastProvider } from './context/ToastContext';
import { PaneStoreProvider } from './context/PaneStore';
import { LandingPage } from './pages/LandingPage';
import { ViewerPage } from './pages/ViewerPage';

/**
 * App shell.
 *
 * HashRouter keeps deep links simple inside Electron (`/#/watch`) without any
 * custom protocol tricks. Guest websites never see this router — they live in
 * separate WebContentsViews owned by the main process.
 */
export default function App() {
  return (
    <ErrorBoundary>
      <ToastProvider>
        <PaneStoreProvider>
          <HashRouter>
            <Routes>
              <Route path="/" element={<LandingPage />} />
              <Route path="/watch" element={<ViewerPage />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </HashRouter>
        </PaneStoreProvider>
      </ToastProvider>
    </ErrorBoundary>
  );
}
