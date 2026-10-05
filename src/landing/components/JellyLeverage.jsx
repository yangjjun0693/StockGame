import { useCallback, useEffect, useRef, useState } from 'react'
import { motion, useMotionValue, useSpring, useTransform } from 'motion/react'
import { SPRING_SOFT, SPRING_JELLY } from '../lib/easings'
import { WOBBLE_EVENT } from '../lib/tokens'

const MIN = 1
const MAX = 50
const MARGIN = 1000
const HANDLE = 56

const clamp = (v, lo, hi) => Math.min(Math.max(v, lo), hi)

export default function JellyLeverage() {
  const [value, setValue] = useState(5)
  const [trackW, setTrackW] = useState(0)
  const [dragging, setDragging] = useState(false)
  const trackRef = useRef(null)
  const relaxTimer = useRef(null)

  // Jelly wiring: a raw motion value gets a short impulse in the direction
  // of the change, a spring then relaxes it back to 0 with a soft wobble.
  // The impulse timer keeps resetting while dragging, so the handle stays
  // stretched during the drag and wobbles only when the pointer settles.
  const raw = useMotionValue(0)
  const stretch = useSpring(raw, SPRING_JELLY)
  const handleScaleX = useTransform(stretch, (s) => 1 + s)
  const handleScaleY = useTransform(stretch, (s) => 1 - s * 0.75)

  const impulse = useCallback(
    (dir, amount) => {
      raw.set(dir * amount)
      clearTimeout(relaxTimer.current)
      relaxTimer.current = setTimeout(() => raw.set(0), 70)
    },
    [raw],
  )

  useEffect(() => {
    const track = trackRef.current
    if (!track) return
    const ro = new ResizeObserver(() => {
      setTrackW(track.getBoundingClientRect().width)
    })
    ro.observe(track)
    return () => ro.disconnect()
  }, [])

  useEffect(() => {
    const onWobble = () => impulse(1, 0.28)
    window.addEventListener(WOBBLE_EVENT, onWobble)
    return () => {
      window.removeEventListener(WOBBLE_EVENT, onWobble)
      clearTimeout(relaxTimer.current)
    }
  }, [impulse])

  const setFromClientX = (clientX) => {
    const rect = trackRef.current?.getBoundingClientRect()
    if (!rect || rect.width <= HANDLE) return
    const usable = rect.width - HANDLE
    const pct = clamp((clientX - rect.left - HANDLE / 2) / usable, 0, 1)
    const next = Math.round(MIN + pct * (MAX - MIN))
    if (next !== value) {
      const delta = next - value
      impulse(Math.sign(delta), clamp(Math.abs(delta) * 0.05, 0.04, 0.35))
      setValue(next)
    }
  }

  const onPointerDown = (e) => {
    e.preventDefault()
    try { trackRef.current.setPointerCapture(e.pointerId) } catch { /* noop */ }
    setDragging(true)
    setFromClientX(e.clientX)
  }
  const onPointerMove = (e) => {
    if (dragging) setFromClientX(e.clientX)
  }
  const onPointerUp = (e) => {
    setDragging(false)
    try { trackRef.current.releasePointerCapture(e.pointerId) } catch { /* noop */ }
  }

  const onKeyDown = (e) => {
    let next = null
    if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') next = clamp(value - 1, MIN, MAX)
    if (e.key === 'ArrowRight' || e.key === 'ArrowUp') next = clamp(value + 1, MIN, MAX)
    if (e.key === 'PageDown') next = clamp(value - 5, MIN, MAX)
    if (e.key === 'PageUp') next = clamp(value + 5, MIN, MAX)
    if (e.key === 'Home') next = MIN
    if (e.key === 'End') next = MAX
    if (next !== null) {
      e.preventDefault()
      impulse(Math.sign(next - value) || 1, 0.18)
      setValue(next)
    }
  }

  const notional = MARGIN * value
  const gain = notional * 0.02
  const liqPct = 85 / value
  const liq = value > 20 ? `-${liqPct.toFixed(1)}%` : `-${Math.round(liqPct)}%`
  const hot = value >= 25

  const pos = trackW > 0 ? ((value - MIN) / (MAX - MIN)) * (trackW - HANDLE) : 0

  return (
    <div className="lp-jelly-wrap">
      <motion.div
        className={`lp-jelly${hot ? ' lp-jelly--hot' : ''}${dragging ? ' lp-jelly--dragging' : ''}`}
        initial={{ scale: 0.92, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 220, damping: 20, delay: 0.35 }}
      >
        <p className="lp-jelly-scenario">
          증거금 <strong>$1,000</strong>을 걸면
        </p>

        <div className="lp-jelly-number" aria-hidden="true">
          <span className="lp-jelly-value">{value}</span>
          <span className="lp-jelly-x">x</span>
        </div>

        <div
          className="lp-jelly-track"
          ref={trackRef}
          role="slider"
          tabIndex={0}
          aria-label="레버리지"
          aria-valuemin={MIN}
          aria-valuemax={MAX}
          aria-valuenow={value}
          aria-valuetext={`${value}배`}
          data-cursor="끌기"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          onKeyDown={onKeyDown}
        >
          <motion.div
            className="lp-jelly-fill"
            style={{ transformOrigin: 'left center' }}
            animate={{ scaleX: value / MAX }}
            transition={SPRING_SOFT}
          />
          <motion.div
            className="lp-jelly-handle"
            animate={{ x: pos }}
            transition={{ type: 'spring', stiffness: 480, damping: 30 }}
            style={{ scaleX: handleScaleX, scaleY: handleScaleY }}
          />
        </div>

        <div className="lp-jelly-scale" aria-hidden="true">
          <span>1x</span>
          <span>50x</span>
        </div>

        <div className="lp-jelly-readouts">
          <div className="lp-jelly-well">
            <span className="lp-jelly-well-label">명목 금액</span>
            <span className="lp-jelly-well-value">
              ${notional.toLocaleString('en-US')}
            </span>
          </div>
          <div className="lp-jelly-well">
            <span className="lp-jelly-well-label">가격 +2%면</span>
            <span className="lp-jelly-well-value lp-jelly-well-value--gain">
              +${gain.toLocaleString('en-US')}
            </span>
          </div>
          <div className="lp-jelly-well">
            <span className="lp-jelly-well-label">청산선</span>
            <span
              className={`lp-jelly-well-value${hot ? ' lp-jelly-well-value--loss' : ''}`}
            >
              {liq}
            </span>
          </div>
        </div>
      </motion.div>
    </div>
  )
}