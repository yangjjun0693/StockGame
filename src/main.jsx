import { StrictMode, lazy, Suspense, useState } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './landing/landing.css'
import Landing from './landing/Landing.jsx'
import { runWipe } from './landing/components/PageWipe.jsx'

const App = lazy(() => import('./App.jsx'))

// Same key as lib/supabase.js. Read directly so supabase-js stays out of the
// landing bundle (App is lazy-loaded).
const hasStoredAccount = () => {
  try {
    return !!localStorage.getItem('stockgame_account')
  } catch {
    return false
  }
}

function Route() {
  // Already logged in -> skip the landing page and go straight to the game
  const [screen, setScreen] = useState(() => (hasStoredAccount() ? 'play' : 'landing'))

  if (screen === 'play') {
    return (
      <Suspense fallback={null}>
        <App />
      </Suspense>
    )
  }
  return <Landing onPlay={() => runWipe(() => setScreen('play'))} />
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Route />
  </StrictMode>,
)