import { useRef } from 'react'
import { motion, useScroll, useTransform } from 'motion/react'
import { useReducedMotion } from '../hooks/useReducedMotion'

const TEXT =
  '돈은 가짜지만 시세는 진짜예요. 틀려도 잃는 건 가상의 만 달러뿐이고, 남는 건 진짜 감각이에요.'

function Word({ progress, range, children }) {
  const opacity = useTransform(progress, range, [0.14, 1])
  return <motion.span style={{ opacity }}>{children} </motion.span>
}

// One large serif paragraph whose words brighten from 14% to 100% opacity
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
