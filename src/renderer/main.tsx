import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './styles/global.css';

const container = document.getElementById('root');
if (!container) throw new Error('Root container #root is missing from index.html');

// Tag the document so CSS can make room for macOS traffic lights.
const platform =
  typeof navigator !== 'undefined' && /Mac/i.test(navigator.platform) ? 'darwin' : 'other';
document.body.classList.add(`platform-${platform}`);

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
