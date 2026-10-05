import { motion } from 'motion/react'
import { useMagnetic } from '../hooks/useMagnetic'

// Pulls the wrapped element toward the cursor and settles back with a
// spring. Disabled for touch and reduced motion inside the hook.
export default function Magnetic({ children, strength = 0.25 }) {
  const { ref, x, y } = useMagnetic({ strength })
  return (
    <motion.div ref={ref} style={{ x, y }} className="lp-magnetic">
      {children}
    </motion.div>
  )
}
