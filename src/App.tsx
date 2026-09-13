import { HashRouter, Navigate, Route, Routes } from 'react-router-dom';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ToastProvider } from './context/ToastContext';
import { VideoStoreProvider } from './context/VideoStore';
import { LandingPage } from './pages/LandingPage';
import { ViewerPage } from './pages/ViewerPage';

/**
 * App shell.
 *
 * HashRouter is deliberate: GitHub Pages serves static files only, so
 * `/#/watch` can be refreshed or shared without ever hitting a 404.
 */
export default function App() {
  return (
    <ErrorBoundary>
      <ToastProvider>
        <VideoStoreProvider>
          <HashRouter>
            <Routes>
              <Route path="/" element={<LandingPage />} />
              <Route path="/watch" element={<ViewerPage />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </HashRouter>
        </VideoStoreProvider>
      </ToastProvider>
    </ErrorBoundary>
  );
}
