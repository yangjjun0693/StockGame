import { motion, useMotionValue, useSpring } from 'motion/react'
import { useEffect } from 'react'
import { useReducedMotion } from '../hooks/useReducedMotion'
import { useFinePointer } from '../hooks/useFinePointer'

// Three large blurred color fields behind the hero. They drift on slow
// 30s+ CSS loops (on an inner element) and answer the pointer through a
// heavily damped spring (outer element), so both transforms never fight.
export default function GradientField() {
  const reduced = useReducedMotion()
  const fine = useFinePointer()

  const x = useMotionValue(0)
  const y = useMotionValue(0)
  const sx = useSpring(x, { stiffness: 40, damping: 24, mass: 1.2 })
  const sy = useSpring(y, { stiffness: 40, damping: 24, mass: 1.2 })

  useEffect(() => {
    if (reduced || !fine) return
    const onMove = (e) => {
      x.set((e.clientX / window.innerWidth - 0.5) * 120)
      y.set((e.clientY / window.innerHeight - 0.5) * 80)
    }
    window.addEventListener('pointermove', onMove, { passive: true })
    return () => window.removeEventListener('pointermove', onMove)
  }, [reduced, fine, x, y])

  return (
    <div className="lp-field" aria-hidden="true">
      <motion.div className="lp-field-layer" style={{ x: sx, y: sy }}>
        <div className="lp-blob lp-blob--butter" />
        <div className="lp-blob lp-blob--peach" />
        <div className="lp-blob lp-blob--sky" />
      </motion.div>
    </div>
  )
}
