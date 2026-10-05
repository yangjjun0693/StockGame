import { motion } from 'motion/react'
import { EASE_OUT_SOFT } from '../lib/easings'
import { useReducedMotion } from '../hooks/useReducedMotion'

// Illustrative self-drawing line. Draws once on entering the viewport.
// Deliberately carries no prices or numbers.
export default function Sparkline({ d, stroke = 'var(--lp-sky-deep)', width = 3 }) {
  const reduced = useReducedMotion()

  return (
    <svg className="lp-spark" viewBox="0 0 200 72" fill="none" aria-hidden="true">
      <motion.path
        d={d}
        stroke={stroke}
        strokeWidth={width}
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={{ pathLength: reduced ? 1 : 0 }}
        whileInView={{ pathLength: 1 }}
        viewport={{ once: true, amount: 0.8 }}
        transition={{ duration: 1.6, ease: EASE_OUT_SOFT }}
      />
    </svg>
  )
}
