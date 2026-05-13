import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { CynosureProvider } from '@arshad-shah/cynosure-react'
import '@arshad-shah/cynosure-react/all.css'
import '@arshad-shah/cynosure-react/fonts.css'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <CynosureProvider theme={{ defaultTheme: 'dark' }}>
      <App />
    </CynosureProvider>
  </StrictMode>,
)
