import { motion, useMotionValue, useSpring } from 'motion/react'
import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { useReducedMotion } from '../hooks/useReducedMotion'
import { useFinePointer } from '../hooks/useFinePointer'

// A small soft blob trailing the pointer with spring lag. Reads the closest
// [data-cursor] element for a tiny contextual label ("끌기" over the jelly
// track, "플레이" over primary buttons). The native cursor stays visible and
// is never hidden on inputs. Desktop fine pointers only.
export default function CustomCursor() {
  const reduced = useReducedMotion()
  const fine = useFinePointer()
  const [label, setLabel] = useState('')
  const [active, setActive] = useState(false)
  const [overInput, setOverInput] = useState(false)

  const x = useMotionValue(-100)
  const y = useMotionValue(-100)
  const sx = useSpring(x, { stiffness: 320, damping: 26, mass: 0.7 })
  const sy = useSpring(y, { stiffness: 320, damping: 26, mass: 0.7 })

  useEffect(() => {
    if (reduced || !fine) return
    const onMove = (e) => {
      x.set(e.clientX)
      y.set(e.clientY)
      const t = e.target
      if (t?.closest?.('input, textarea, select, [contenteditable]')) {
        setOverInput(true)
        setActive(false)
        setLabel('')
        return
      }
      setOverInput(false)
      const hit = t?.closest?.('[data-cursor]')
      setLabel(hit ? hit.getAttribute('data-cursor') || '' : '')
      setActive(Boolean(hit))
    }
    window.addEventListener('pointermove', onMove, { passive: true })
    return () => window.removeEventListener('pointermove', onMove)
  }, [reduced, fine, x, y])

  if (reduced || !fine) return null

  return createPortal(
    <motion.div
      className="lp-cursor"
      style={{ x: sx, y: sy }}
      aria-hidden="true"
      data-active={active || undefined}
      data-hidden={overInput || undefined}
      data-labeled={label ? true : undefined}
    >
      <span className="lp-cursor-label">{label}</span>
    </motion.div>,
    document.body,
  )
}
