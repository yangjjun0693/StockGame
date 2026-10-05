import { StrictMode, lazy, Suspense, useState } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './landing/landing.css'
import Landing from './landing/Landing.jsx'
import { runWipe } from './landing/components/PageWipe.jsx'

const App = lazy(() => import('./App.jsx'))

function Route() {
  const [screen, setScreen] = useState('landing')

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
