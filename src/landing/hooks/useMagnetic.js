import { useEffect, useRef } from 'react'
import { useMotionValue, useSpring } from 'motion/react'
import { SPRING_SOFT } from '../lib/easings'

// Pulls the wrapped element toward the cursor while it is over the element,
// then settles back with a soft spring. Hover-area based, so it stays cheap.
export function useMagnetic({ strength = 0.25 } = {}) {
  const ref = useRef(null)
  const x = useMotionValue(0)
  const y = useMotionValue(0)
  const sx = useSpring(x, SPRING_SOFT)
  const sy = useSpring(y, SPRING_SOFT)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (window.matchMedia('(pointer: fine)').matches === false) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    const onMove = (e) => {
      const rect = el.getBoundingClientRect()
      const dx = e.clientX - (rect.left + rect.width / 2)
      const dy = e.clientY - (rect.top + rect.height / 2)
      x.set(dx * strength)
      y.set(dy * strength)
    }
    const onLeave = () => {
      x.set(0)
      y.set(0)
    }

    el.addEventListener('pointermove', onMove, { passive: true })
    el.addEventListener('pointerleave', onLeave, { passive: true })
    return () => {
      el.removeEventListener('pointermove', onMove)
      el.removeEventListener('pointerleave', onLeave)
    }
  }, [strength, x, y])

  return { ref, x: sx, y: sy }
}
