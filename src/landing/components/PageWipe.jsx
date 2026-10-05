// Two-layer color wipe that covers the screen, switches to the game while
// covered, then uncovers from the top. Rendered outside React so it survives
// the unmount of the landing page. Wipe colors follow the current theme.
export function runWipe(onDone) {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    onDone()
    return
  }

  const dark = document.documentElement.classList.contains('dark')
  const front = dark ? '#f0f0f0' : '#111827'
  const back = dark ? '#131316' : '#f0f2f5'

  const make = (bg, delay) => {
    const el = document.createElement('div')
    el.style.cssText = [
      'position:fixed',
      'inset:0',
      'z-index:2147483000',
      'pointer-events:none',
      `background:${bg}`,
      'transform:scaleY(0)',
      'transform-origin:bottom',
      'border-radius:48px 48px 0 0',
    ].join(';')
    document.body.appendChild(el)
    const anim = el.animate(
      [
        { transform: 'scaleY(0)', transformOrigin: 'bottom' },
        { transform: 'scaleY(1)', transformOrigin: 'bottom', offset: 0.42 },
        { transform: 'scaleY(1)', transformOrigin: 'top', offset: 0.55 },
        { transform: 'scaleY(0)', transformOrigin: 'top' },
      ],
      {
        duration: 920,
        delay,
        easing: 'cubic-bezier(.65,0,.35,1)',
        fill: 'both',
      },
    )
    anim.onfinish = () => el.remove()
  }

  make(back, 0)
  make(front, 70)
  setTimeout(onDone, 560)
}
