import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { isTauriRuntime } from './lib/nativeChrome'
import './index.css'
import App from './App.tsx'

if (isTauriRuntime()) {
  document.documentElement.classList.add('platform-tauri', 'platform-macos')
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
