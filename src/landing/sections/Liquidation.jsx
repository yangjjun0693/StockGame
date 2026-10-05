import { useEffect, useId, useMemo, useRef, useState } from 'react'
import PillButton from '../components/PillButton'

// Toy, not market data: a random walk that starts at 100. The side pill, the
// leverage slider, the caps per asset and the liquidation rule all mirror the
// real game (App.jsx): forced liquidation once equity drops below 15% of the
// margin, i.e. a loss of 85%. A liquidated position loses the whole margin.
const MARGIN = 1000
const ENTRY = 100
const WINDOW = 100
const TICK_MS = 60
const SIGMA = 0.0046
const MAINT = 0.15
const LOSS_LIMIT = 1 - MAINT
const VB_W = 600
const VB_H = 220
const SNAPS = [1, 2, 3, 5, 10, 15, 20, 25, 30, 40, 50]
const ASSETS = [
  { key: 'stock', label: '주식', max: 4 },
  { key: 'fx', label: '외환', max: 20 },
  { key: 'coin', label: '코인', max: 50 },
]

const levPct = (v, max) => ((v - 1) / (max - 1)) * 100

// Sum of 6 uniforms, rescaled to roughly unit variance
const gauss = () => {
  let u = 0
  for (let i = 0; i < 6; i++) u += Math.random()
  return (u - 3) / Math.sqrt(0.5)
}

const usd = (n) => `${n < 0 ? '-' : '+'}$${Math.abs(Math.round(n)).toLocaleString()}`

/* Same sliding glass pill as the game's SidePillToggle */
function SidePill({ side, onChange, disabled }) {
  const short = side === 'short'
  return (
    <div className={disabled ? 'lp-side is-disabled' : 'lp-side'} role="group" aria-label="방향">
      <span className={short ? 'lp-side-bg is-short' : 'lp-side-bg is-long'} aria-hidden="true" />
      <button type="button" className={short ? 'lp-side-btn' : 'lp-side-btn is-on'}
        aria-pressed={!short} disabled={disabled} onClick={() => onChange('long')}>Long</button>
      <button type="button" className={short ? 'lp-side-btn is-on' : 'lp-side-btn'}
        aria-pressed={short} disabled={disabled} onClick={() => onChange('short')}>Short</button>
    </div>
  )
}

/* Same behaviour as the game's LeverageSlider: magnet snap points, overshoot
   on release, thumb grows with a halo while dragging, value tooltip. */
function LevSlider({ value, onChange, max, disabled, leftSlot }) {
  const trackRef = useRef(null)
  const [drag, setDrag] = useState(null) // value under the pointer while dragging
  const dragging = drag !== null
  const shown = drag ?? value
  const snaps = useMemo(() => {
    const pts = SNAPS.filter((v) => v <= max)
    if (pts[pts.length - 1] !== max) pts.push(max)
    return pts
  }, [max])

  const fromX = (clientX) => {
    const rect = trackRef.current.getBoundingClientRect()
    const p = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width))
    const raw = 1 + p * (max - 1)
    let snapped = raw
    let best = Infinity
    const win = Math.max(0.6, max * 0.03)
    for (const sp of snaps) {
      const d = Math.abs(raw - sp)
      if (d < win && d < best) {
        best = d
        snapped = sp
      }
    }
    return Math.round(snapped)
  }

  const update = (x) => {
    const v = fromX(x)
    setDrag(v)
    onChange(v)
  }
  const down = (e) => {
    if (disabled) return
    trackRef.current.setPointerCapture(e.pointerId)
    update(e.clientX)
  }
  const move = (e) => {
    if (dragging) update(e.clientX)
  }
  const up = (e) => {
    setDrag(null)
    try { trackRef.current.releasePointerCapture(e.pointerId) } catch { /* noop */ }
  }
  const key = (e) => {
    if (disabled) return
    if (e.key === 'ArrowRight') onChange(Math.min(max, value + 1))
    if (e.key === 'ArrowLeft') onChange(Math.max(1, value - 1))
  }

  const pct = levPct(shown, max)
  return (
    <div className={disabled ? 'lp-lev is-disabled' : 'lp-lev'}>
      <div className="lp-lev-head">
        {leftSlot}
        <span className="lp-lev-value">{shown}x</span>
      </div>
      <div className="lp-lev-track" ref={trackRef} role="slider" tabIndex={disabled ? -1 : 0}
        aria-label="레버리지" aria-valuemin={1} aria-valuemax={max} aria-valuenow={value}
        onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up} onKeyDown={key}>
        <div className="lp-lev-rail" />
        <div className={dragging ? 'lp-lev-fill is-drag' : 'lp-lev-fill'} style={{ width: `${pct}%` }} />
        {snaps.map((sp) => (
          <i key={sp} className={sp <= shown ? 'lp-lev-dot is-passed' : 'lp-lev-dot'} style={{ left: `${levPct(sp, max)}%` }} />
        ))}
        <div className={dragging ? 'lp-lev-thumb is-drag' : 'lp-lev-thumb'} style={{ left: `${pct}%` }} />
        {dragging && <div className="lp-lev-tip" style={{ left: `${pct}%` }}>{shown}x</div>}
      </div>
      <div className="lp-lev-scale"><span>1x</span><span>{max}x</span></div>
    </div>
  )
}

export default function Liquidation() {
  const gid = useId().replace(/:/g, '')
  const [assetKey, setAssetKey] = useState('coin')
  const [side, setSide] = useState('long')
  const [lev, setLev] = useState(20)
  const [phase, setPhase] = useState('idle') // idle | run | dead | closed
  const [pts, setPts] = useState([ENTRY])
  const price = useRef(ENTRY)

  const asset = ASSETS.find((a) => a.key === assetKey)
  const sign = side === 'short' ? -1 : 1
  const running = phase === 'run'

  useEffect(() => {
    if (!running) return undefined
    const id = setInterval(() => {
      const next = price.current * (1 + SIGMA * gauss())
      price.current = next
      setPts((p) => [...p.slice(-(WINDOW - 1)), next])
      if (lev > 1 && sign * (next / ENTRY - 1) * lev <= -LOSS_LIMIT) setPhase('dead')
    }, TICK_MS)
    return () => clearInterval(id)
  }, [running, sign, lev])

  const pickAsset = (a) => {
    setAssetKey(a.key)
    setLev((l) => Math.min(l, a.max))
  }
  const reset = () => {
    price.current = ENTRY
    setPts([ENTRY])
    setPhase('idle')
  }
  const start = () => {
    price.current = ENTRY
    setPts([ENTRY])
    setPhase('run')
  }

  const dead = phase === 'dead'
  const over = phase === 'dead' || phase === 'closed'
  const cur = pts[pts.length - 1]
  const pnlPct = dead ? -1 : Math.max(sign * (cur / ENTRY - 1) * lev, -1)
  const pnl = pnlPct * MARGIN
  const tone = pnl < 0 ? 'down' : 'up'
  const liq = lev > 1 ? ENTRY * (1 - (sign * LOSS_LIMIT) / lev) : null
  const showLiq = liq !== null && Math.abs(liq - ENTRY) / ENTRY <= 0.3
  const danger = running && lev > 1 && pnlPct <= -0.55

  let lo = Math.min(97, ...pts, ...(showLiq ? [liq] : []))
  let hi = Math.max(103, ...pts, ...(showLiq ? [liq] : []))
  const pad = (hi - lo) * 0.06
  lo -= pad
  hi += pad
  const yPct = (v) => ((hi - v) / (hi - lo)) * 100
  const y = (v) => ((yPct(v) / 100) * VB_H).toFixed(1)
  const stepX = VB_W / (WINDOW - 1)
  const coords = pts.map((v, i) => `${(i * stepX).toFixed(1)},${y(v)}`)
  const lastX = ((pts.length - 1) * stepX).toFixed(1)
  const sideText = side === 'short' ? 'Short' : 'Long'

  let toastText = ''
  if (dead) toastText = `청산 · ${asset.label} ${sideText} ${lev}x · -$${MARGIN.toLocaleString()}`
  if (phase === 'closed') toastText = `매도 · ${asset.label} ${sideText} ${lev}x · ${usd(pnl)}`

  let verdict = '종류, 방향, 레버리지를 고르고 매수해 보세요.'
  if (running) verdict = '가격이 움직이는 중이에요.'
  if (dead) verdict = '증거금 $1,000이 전부 사라졌어요.'
  if (phase === 'closed') verdict = '직접 정리하면 이렇게 끝나요.'

  return (
    <section className="lp-liq" id="liquidation">
      <div className="lp-liq-grid">
        <h2 className="lp-h2 lp-liq-title">청산 한 번 당해보기</h2>

        <div className="lp-liq-card" data-dead={dead || undefined}>
          <div className="lp-liq-top">
            <div className="lp-chips" role="group" aria-label="자산 종류">
              {ASSETS.map((a) => (
                <button key={a.key} type="button" aria-pressed={a.key === assetKey}
                  className={a.key === assetKey ? 'lp-chip is-on' : 'lp-chip'}
                  disabled={running} onClick={() => pickAsset(a)}>{a.label}</button>
              ))}
            </div>
            {running ? (
              <PillButton dataCursor="매도" onClick={() => setPhase('closed')}>매도</PillButton>
            ) : phase === 'idle' ? (
              <PillButton dataCursor="매수" onClick={start}>매수</PillButton>
            ) : (
              <PillButton dataCursor="다시" onClick={reset}>다시</PillButton>
            )}
          </div>

          <LevSlider value={lev} max={asset.max} disabled={running || over}
            onChange={setLev}
            leftSlot={<SidePill side={side} onChange={setSide} disabled={running || over} />} />

          <div className="lp-liq-chart" data-tone={tone}>
            <svg viewBox={`0 0 ${VB_W} ${VB_H}`} preserveAspectRatio="none" aria-hidden="true">
              <defs>
                <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--tone)" stopOpacity="0.28" />
                  <stop offset="100%" stopColor="var(--tone)" stopOpacity="0" />
                </linearGradient>
              </defs>
              <line className="lp-liq-entry" x1="0" x2={VB_W} y1={y(ENTRY)} y2={y(ENTRY)} />
              {showLiq && (
                <line className={danger ? 'lp-liq-liqline is-danger' : 'lp-liq-liqline'}
                  x1="0" x2={VB_W} y1={y(liq)} y2={y(liq)} />
              )}
              {pts.length > 1 && (
                <polygon points={`0,${VB_H} ${coords.join(' ')} ${lastX},${VB_H}`} fill={`url(#${gid})`} className="lp-liq-area" />
              )}
              <polyline className="lp-liq-price" points={coords.join(' ')} />
            </svg>
            <span className="lp-liq-tag" style={{ top: `${yPct(ENTRY)}%` }}>진입가</span>
            {showLiq && <span className="lp-liq-tag lp-liq-tag--liq" style={{ top: `${yPct(liq)}%` }}>청산선</span>}
            {pts.length > 1 && !over && (
              <span className="lp-liq-head" style={{ left: `${((pts.length - 1) / (WINDOW - 1)) * 100}%`, top: `${yPct(cur)}%` }} />
            )}
            {over && <div className={`lp-liq-toast is-${dead ? 'liq' : tone}`} key={phase}>{toastText}</div>}
          </div>

          <dl className="lp-liq-stats">
            <div><dt>현재가</dt><dd key={cur.toFixed(2)} className={running ? 'lp-liq-flash' : ''}>{cur.toFixed(2)}</dd></div>
            <div>
              <dt>손익</dt>
              <dd className={pnl > 0 ? 'is-up' : pnl < 0 ? 'is-down' : ''}>{pnl === 0 ? '$0' : usd(pnl)}</dd>
            </div>
            <div><dt>청산가</dt><dd className="is-down">{liq === null ? '없음' : liq.toFixed(2)}</dd></div>
          </dl>

          <p className={dead ? 'lp-liq-verdict is-dead' : 'lp-liq-verdict'} aria-live="polite">{verdict}</p>
        </div>

        <p className="lp-liq-note">
          체험용 시뮬레이션이라 가격은 무작위로 움직여요. 증거금은 $1,000으로 고정이고, 레버리지 상한은 게임처럼 주식 4배, 외환 20배, 코인 50배예요.
        </p>
      </div>
    </section>
  )
}