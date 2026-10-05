import { useEffect, useState } from 'react'
import Lenis from 'lenis'
import { setLenis } from './lib/lenis'
import GradientField from './components/GradientField'
import CustomCursor from './components/CustomCursor'
import BackToTop from './components/BackToTop'
import Nav from './sections/Nav'
import Hero from './sections/Hero'
import Manifesto from './sections/Manifesto'
import Markets from './sections/Markets'
import Liquidation from './sections/Liquidation'
import FinalCta from './sections/FinalCta'
import Footer from './sections/Footer'

// Shares the game's theme mechanism: html.dark class + 'stockgame_theme'
// localStorage key, so the theme carries over between landing and game.
const prefersDark = () =>
  window.matchMedia('(prefers-color-scheme: dark)').matches

export default function Landing({ onPlay }) {
  const [dark, setDark] = useState(() => {
    try {
      const saved = localStorage.getItem('stockgame_theme')
      if (saved) return saved === 'dark'
    } catch {
      // localStorage unavailable, fall through to system preference
    }
    return prefersDark()
  })

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark)
    try {
      localStorage.setItem('stockgame_theme', dark ? 'dark' : 'light')
    } catch {
      // ignore write failures (private mode)
    }
  }, [dark])

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const lenis = new Lenis({
      lerp: 0.1,
      smoothWheel: true,
      anchors: { offset: -96 },
    })
    let rafId = 0
    const raf = (time) => {
      lenis.raf(time)
      rafId = requestAnimationFrame(raf)
    }
    rafId = requestAnimationFrame(raf)
    setLenis(lenis)
    return () => {
      cancelAnimationFrame(rafId)
      lenis.destroy()
      setLenis(null)
    }
  }, [])

  return (
    <div className="lp">
      <GradientField />
      <Nav dark={dark} onToggleTheme={() => setDark((d) => !d)} onPlay={onPlay} />
      <main>
        <Hero onPlay={onPlay} />
        <Manifesto />
        <Markets />
        <Liquidation />
        <FinalCta onPlay={onPlay} />
      </main>
      <Footer />
      <BackToTop />
      <CustomCursor />
    </div>
  )
}