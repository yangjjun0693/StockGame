import { motion } from 'motion/react'
import { EASE_OUT_SOFT } from '../lib/easings'
import { useReducedMotion } from '../hooks/useReducedMotion'
import PillButton from '../components/PillButton'
import Magnetic from '../components/Magnetic'

export default function FinalCta({ onPlay }) {
  const reduced = useReducedMotion()

  return (
    <section className="lp-cta">
      <motion.h2
        className="lp-cta-headline"
        initial={reduced ? false : { opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.5 }}
        transition={{ duration: 1, ease: EASE_OUT_SOFT }}
      >
        <span className="lp-cta-line">만 달러로</span>
        <span className="lp-cta-line">시작해요</span>
      </motion.h2>
      <div className="lp-cta-action">
        <Magnetic>
          <PillButton onPlay={onPlay} size="lg">
            게임 열기
          </PillButton>
        </Magnetic>
      </div>
    </section>
  )
}
