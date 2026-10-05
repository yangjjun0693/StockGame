import { motion } from 'motion/react'
import { SPRING_SOFT } from '../lib/easings'
import { runWipe } from './PageWipe'

// Squishy pill button styled like the game's gray-900 pills. Compresses on
// press, settles with a soft overshoot. When onPlay is given, the click runs
// the page wipe and then opens the game.
export default function PillButton({ children, onPlay, size = 'md', className = '', dataCursor, ...rest }) {
  const cls = `lp-pill lp-pill--primary lp-pill--${size} ${className}`.trim()

  return (
    <motion.button
      type="button"
      className={cls}
      data-cursor={dataCursor ?? (onPlay ? '플레이' : undefined)}
      whileTap={{ scaleX: 0.94, scaleY: 0.9 }}
      transition={SPRING_SOFT}
      onClick={onPlay ? () => runWipe(onPlay) : rest.onClick}
      {...(onPlay ? {} : rest)}
    >
      <span className="lp-pill-label">{children}</span>
    </motion.button>
  )
}
