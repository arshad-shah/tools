import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { CynosureProvider } from '@arshad-shah/cynosure-react'
import { registerCynosureThemes } from '@arshad-shah/cynosure-react/chart'
import '@arshad-shah/cynosure-react/all.css'
import '@arshad-shah/cynosure-react/fonts.css'
import './theme/dashboard-theme.css'
import './index.css'
import App from './App.tsx'

registerCynosureThemes();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <CynosureProvider
      theme={{
        defaultTheme: 'dashboard-dark',
        themes: ['dashboard-light', 'dashboard-dark'],
        enableSystem: false,
      }}
    >
      <App />
    </CynosureProvider>
  </StrictMode>,
)
