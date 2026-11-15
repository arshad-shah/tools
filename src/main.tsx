import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './theme/tokens.css';
import './index.css';
import App from './app/App';
import { startThemeSync } from './shared/lib/theme';

// Follow OS theme changes and other tabs even before any themed UI mounts.
startThemeSync();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
