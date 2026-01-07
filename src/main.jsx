import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import posthog from 'posthog-js'
import './index.css'
import App from './App.jsx'

posthog.init(import.meta.env.VITE_POSTHOG_KEY, {
  api_host: import.meta.env.VITE_POSTHOG_HOST,
  ui_host: 'https://us.posthog.com',
  person_profiles: 'identified_only',
  session_recording: {
    maskAllInputs: false,
    maskTextSelector: null,
    recordCanvas: true, // Helper to verify map interactions
  },
  loaded: (ph) => {
    if (import.meta.env.DEV) ph.debug();
    window.posthog = ph;
  }
})

// --- Console Signature ---
const IS_IFRAMED = window.self !== window.top;
const REFERRER = document.referrer || '';
const IS_INTERNAL_PARENT = REFERRER.includes('seanhardestylewis.com') || REFERRER.includes('localhost') || REFERRER.includes('127.0.0.1');

if (!IS_IFRAMED || !IS_INTERNAL_PARENT) {
  console.log(`
███████╗███████╗ █████╗ ██████╗  ██████╗██╗  ██╗ █████╗ ██████╗ ██╗     ███████╗
██╔════╝██╔════╝██╔══██╗██╔══██╗██╔════╝██║  ██║██╔══██╗██╔══██╗██║     ██╔════╝
███████╗█████╗  ███████║██████╔╝██║     ███████║███████║██████╔╝██║     █████╗
╚════██║██╔══╝  ██╔══██║██╔══██╗██║     ██╔══██║██╔══██║██╔══██╗██║     ██╔══╝
███████║███████╗██║  ██║██║  ██║╚██████╗██║  ██║██║  ██║██████╔╝███████╗███████╗
╚══════╝╚══════╝╚═╝  ╚═╝╚═╝  ╚═╝ ╚═════╝╚═╝  ╚═╝╚═╝  ╚═╝╚═════╝ ╚══════╝╚══════╝
             ██████╗██╗████████╗██╗   ██╗
            ██╔════╝██║╚══██╔══╝╚██╗ ██╔╝
            ██║     ██║   ██║    ╚████╔╝
            ██║     ██║   ██║     ╚██╔╝
            ╚██████╗██║   ██║      ██║
             ╚═════╝╚═╝   ╚═╝      ╚═╝

       Made by Sean Hardesty Lewis
      https://seanhardestylewis.com
`);
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
