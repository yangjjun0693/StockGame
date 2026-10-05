import { WOBBLE_EVENT } from '../lib/tokens'
import ThemeToggle from '../components/ThemeToggle'
import PillButton from '../components/PillButton'

export default function Nav({ dark, onToggleTheme, onPlay }) {
  return (
    <header className="lp-nav-wrap">
      <nav className="lp-nav" aria-label="주요 메뉴">
        <button
          type="button"
          className="lp-nav-mark"
          data-cursor=""
          onClick={() => window.dispatchEvent(new Event(WOBBLE_EVENT))}
        >
          주식게임
        </button>
        <div className="lp-nav-right">
          <ThemeToggle dark={dark} onToggle={onToggleTheme} />
          <PillButton size="sm" onPlay={onPlay}>
            시작하기
          </PillButton>
        </div>
      </nav>
    </header>
  )
}
