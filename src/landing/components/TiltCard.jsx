import { motion, useMotionValue, useSpring } from 'motion/react'
import { useRef } from 'react'
import { SPRING_SOFT } from '../lib/easings'
import { useReducedMotion } from '../hooks/useReducedMotion'
import { useFinePointer } from '../hooks/useFinePointer'

// Tilts toward the pointer (max 8deg, damped spring) and passes the pointer
// position through CSS vars so a soft highlight can follow it in CSS.
export default function TiltCard({ children, className = '', max = 8, ...rest }) {
  const reduced = useReducedMotion()
  const fine = useFinePointer()
  const ref = useRef(null)

  const rx = useMotionValue(0)
  const ry = useMotionValue(0)
  const srx = useSpring(rx, SPRING_SOFT)
  const sry = useSpring(ry, SPRING_SOFT)

  const onMove = (e) => {
    const rect = ref.current?.getBoundingClientRect()
    if (!rect) return
    const px = (e.clientX - rect.left) / rect.width
    const py = (e.clientY - rect.top) / rect.height
    ry.set((px - 0.5) * 2 * max)
    rx.set(-(py - 0.5) * 2 * max)
    ref.current?.style.setProperty('--mx', `${px * 100}%`)
    ref.current?.style.setProperty('--my', `${py * 100}%`)
  }
  const onLeave = () => {
    rx.set(0)
    ry.set(0)
  }

  if (reduced || !fine) {
    return (
      <div className={className} {...rest}>
        {children}
      </div>
    )
  }

  return (
    <motion.div
      ref={ref}
      className={className}
      style={{ rotateX: srx, rotateY: sry, transformPerspective: 900 }}
      onPointerMove={onMove}
      onPointerLeave={onLeave}
      {...rest}
    >
      {children}
    </motion.div>
  )
}
