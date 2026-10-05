import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { SPRING_SOFT } from '../lib/easings'
import { getLenis } from '../lib/lenis'
import { useReducedMotion } from '../hooks/useReducedMotion'

// Rises into place once the visitor scrolls past the hero.
export default function BackToTop() {
  const reduced = useReducedMotion()
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > window.innerHeight * 0.9)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const toTop = () => {
    const lenis = getLenis()
    if (!reduced && lenis) {
      lenis.scrollTo(0)
    } else if (reduced) {
      window.scrollTo(0, 0)
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  return (
    <AnimatePresence>
      {visible && (
        <motion.button
          type="button"
          className="lp-top"
          aria-label="맨 위로"
          data-cursor=""
          onClick={toTop}
          initial={reduced ? false : { y: 64, opacity: 0, scale: 0.9 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={reduced ? undefined : { y: 64, opacity: 0, scale: 0.9 }}
          transition={SPRING_SOFT}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M12 19V5M5 12l7-7 7 7" />
          </svg>
        </motion.button>
      )}
    </AnimatePresence>
  )
}
