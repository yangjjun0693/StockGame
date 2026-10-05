import { motion } from 'motion/react'
import { EASE_OUT_SOFT } from '../lib/easings'
import { getLenis } from '../lib/lenis'
import { useReducedMotion } from '../hooks/useReducedMotion'
import PillButton from '../components/PillButton'
import Magnetic from '../components/Magnetic'
import JellyLeverage from '../components/JellyLeverage'

const LINES = ['진짜 시세로,', '가짜 돈으로.']

function MaskedLine({ children, delay }) {
  return (
    <span className="lp-hero-line-mask">
      <motion.span
        className="lp-hero-line"
        initial={{ y: '110%' }}
        animate={{ y: '0%' }}
        transition={{ duration: 1, ease: EASE_OUT_SOFT, delay }}
      >
        {children}
      </motion.span>
    </span>
  )
}

export default function Hero({ onPlay }) {
  const reduced = useReducedMotion()

  const scrollToMarkets = () => {
    const el = document.getElementById('markets')
    if (!el) return
    const lenis = getLenis()
    if (!reduced && lenis) {
      lenis.scrollTo(el, { offset: -96 })
    } else if (reduced) {
      el.scrollIntoView()
    } else {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }

  return (
    <section className="lp-hero" id="top">
      <div className="lp-hero-grid">
        <div className="lp-hero-copy">
          <h1 className="lp-hero-headline">
            {reduced ? (
              <>
                <span className="lp-hero-line-mask">
                  <span className="lp-hero-line">{LINES[0]}</span>
                </span>
                <span className="lp-hero-line-mask">
                  <span className="lp-hero-line">{LINES[1]}</span>
                </span>
              </>
            ) : (
              LINES.map((line, i) => (
                <MaskedLine key={line} delay={i * 0.12}>
                  {line}
                </MaskedLine>
              ))
            )}
          </h1>

          <motion.p
            className="lp-hero-sub"
            initial={reduced ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, ease: EASE_OUT_SOFT, delay: 0.7 }}
          >
            $10,000으로 시작하는 모의투자. 주식, 코인, 외환을 실제 가격으로
            사고팔고, 랭킹에서 다른 사람들과 비교해요.
          </motion.p>

          <motion.div
            className="lp-hero-actions"
            initial={reduced ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.7, ease: EASE_OUT_SOFT, delay: 0.9 }}
          >
            <Magnetic>
              <PillButton onPlay={onPlay} size="lg">
                바로 해보기
              </PillButton>
            </Magnetic>
            <button
              type="button"
              className="lp-link-quiet"
              data-cursor=""
              onClick={scrollToMarkets}
            >
              어떻게 하는 건지 보기
            </button>
          </motion.div>
        </div>

        <div className="lp-hero-jelly">
          <JellyLeverage />
        </div>
      </div>
    </section>
  )
}
