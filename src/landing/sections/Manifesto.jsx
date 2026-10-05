import { useRef } from 'react'
import { motion, useScroll, useTransform } from 'motion/react'
import { useReducedMotion } from '../hooks/useReducedMotion'

const TEXT =
  '사 보기 전에는 모르는 게 많아요. 오르는 날도, 내리는 날도, 청산당하는 날도 직접 겪어 보세요.'

function Word({ progress, range, children }) {
  const opacity = useTransform(progress, range, [0.14, 1])
  return <motion.span style={{ opacity }}>{children} </motion.span>
}

// One large paragraph whose words brighten from 14% to 100% opacity
// as the section scrolls through the viewport.
export default function Manifesto() {
  const reduced = useReducedMotion()
  const ref = useRef(null)
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start 0.85', 'end 0.45'],
  })

  const words = TEXT.split(' ')

  return (
    <section className="lp-manifesto">
      <p className="lp-manifesto-text" ref={ref}>
        {reduced
          ? TEXT
          : words.map((word, i) => {
              const start = (i / words.length) * 0.75
              return (
                <Word
                  key={`${word}-${i}`}
                  progress={scrollYProgress}
                  range={[start, Math.min(start + 0.22, 1)]}
                >
                  {word}
                </Word>
              )
            })}
      </p>
    </section>
  )
}