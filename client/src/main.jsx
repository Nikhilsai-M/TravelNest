import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { ClerkProvider } from '@clerk/clerk-react'
import 'leaflet/dist/leaflet.css'
import './index.css'
import App from './App.jsx'
import MissingClerkConfig from './components/MissingClerkConfig.jsx'

const publishableKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY
const hasValidPublishableKey =
  typeof publishableKey === 'string' &&
  publishableKey.trim().length > 0 &&
  publishableKey !== 'your_clerk_publishable_key' &&
  publishableKey.startsWith('pk_')

createRoot(document.getElementById('root')).render(
  <StrictMode>
    {hasValidPublishableKey ? (
      <ClerkProvider publishableKey={publishableKey} afterSignOutUrl="/">
        <App />
      </ClerkProvider>
    ) : (
      <MissingClerkConfig />
    )}
  </StrictMode>,
)
