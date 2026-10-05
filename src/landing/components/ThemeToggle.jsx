import { useState } from 'react'
import { motion } from 'motion/react'
import { Sun, Moon } from 'lucide-react'
import { SPRING_SOFT } from '../lib/easings'

// Same icon set and behavior as the game's #theme-toggle.
export default function ThemeToggle({ dark, onToggle }) {
  const [spin, setSpin] = useState(0)

  return (
    <motion.button
      type="button"
      className="lp-nav-theme"
      aria-label="테마 바꾸기"
      data-cursor=""
      whileTap={{ scale: 0.88 }}
      transition={SPRING_SOFT}
      onClick={() => {
        setSpin((s) => s + 1)
        onToggle()
      }}
    >
      <motion.span
        key={spin}
        initial={{ rotate: -100, scale: 0.4, opacity: 0, filter: 'blur(3px)' }}
        animate={{ rotate: 0, scale: 1, opacity: 1, filter: 'blur(0px)' }}
        transition={{ type: 'spring', stiffness: 300, damping: 20 }}
        className="lp-nav-theme-icon"
      >
        {dark ? <Sun size={18} /> : <Moon size={18} />}
      </motion.span>
    </motion.button>
  )
}
