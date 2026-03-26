function reducedMotionEnabled(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

let bootstrapDone = false

function initStickyNav(): void {
  if (reducedMotionEnabled() || typeof window === 'undefined') return
  if ((window as any).__skillupStickyNavInit) return
  ;(window as any).__skillupStickyNavInit = true
  const onScroll = () => {
    const y = window.scrollY > 50
    const nodes = document.querySelectorAll('header, nav')
    nodes.forEach((n) => n.classList.toggle('scrolled', y))
  }
  window.addEventListener('scroll', onScroll, { passive: true })
  onScroll()
}

function initScrollReveal(): void {
  if (typeof window === 'undefined' || reducedMotionEnabled()) return

  const candidates = document.querySelectorAll(
    'section, .card, .card-animated, h2, h3, .glass-card, img, p, table',
  )
  candidates.forEach((el) => {
    if (!el.classList.contains('reveal')) el.classList.add('reveal')
  })

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry, i) => {
        if (!entry.isIntersecting) return
        const el = entry.target as HTMLElement
        el.style.transitionDelay = `${(i % 6) * 90}ms`
        el.classList.add('revealed')
        observer.unobserve(el)
      })
    },
    // 0.15 can keep very tall blocks (large tables) permanently hidden.
    // Use a tiny threshold so reveal triggers as soon as the section starts entering viewport.
    { threshold: 0.01 },
  )

  document.querySelectorAll('.reveal').forEach((el) => {
    if (!(el as HTMLElement).classList.contains('revealed')) observer.observe(el)
  })
}

function initRippleButtons(): void {
  if (typeof window === 'undefined' || reducedMotionEnabled()) return
  const buttons = document.querySelectorAll('button, .btn, .button-micro')
  buttons.forEach((btn) => {
    const el = btn as HTMLElement
    if (el.dataset.rippleBound === '1') return
    el.dataset.rippleBound = '1'
    btn.addEventListener('click', function onRipple(e: Event) {
      const me = this as HTMLElement
      const mouse = e as MouseEvent
      const rect = me.getBoundingClientRect()
      const size = Math.max(rect.width, rect.height)
      const ripple = document.createElement('span')
      ripple.className = 'ripple'
      ripple.style.width = `${size}px`
      ripple.style.height = `${size}px`
      ripple.style.left = `${mouse.clientX - rect.left - size / 2}px`
      ripple.style.top = `${mouse.clientY - rect.top - size / 2}px`
      me.appendChild(ripple)
      window.setTimeout(() => ripple.remove(), 600)
    })
  })
}

function animateCounter(el: HTMLElement): void {
  const target = Number(el.getAttribute('data-target') ?? '0')
  if (!Number.isFinite(target) || target <= 0) return
  const suffix = el.dataset.suffix ?? ''
  const duration = 1800
  const step = target / (duration / 16)
  let current = 0
  const timer = window.setInterval(() => {
    current += step
    if (current >= target) {
      el.textContent = `${Math.round(target).toLocaleString()}${suffix}`
      window.clearInterval(timer)
    } else {
      el.textContent = `${Math.floor(current).toLocaleString()}${suffix}`
    }
  }, 16)
}

function initCounters(): void {
  if (typeof window === 'undefined' || reducedMotionEnabled()) return
  const obs = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return
        animateCounter(entry.target as HTMLElement)
        obs.unobserve(entry.target)
      })
    },
    { threshold: 0.5 },
  )
  document.querySelectorAll<HTMLElement>('[data-target]').forEach((el) => {
    if (el.dataset.counterBound === '1') return
    el.dataset.counterBound = '1'
    obs.observe(el)
  })
}

function initTabs(): void {
  if (typeof window === 'undefined') return
  document.querySelectorAll<HTMLElement>('.tab-btn').forEach((btn) => {
    if (btn.dataset.tabBound === '1') return
    btn.dataset.tabBound = '1'
    btn.addEventListener('click', function onTab() {
      const target = (this as HTMLElement).dataset.target
      if (!target) return
      const indicator = (this.parentElement?.querySelector('.tab-indicator') ??
        document.querySelector('.tab-indicator')) as HTMLElement | null
      if (indicator && this.parentElement) {
        const rect = (this as HTMLElement).getBoundingClientRect()
        const parentRect = this.parentElement.getBoundingClientRect()
        indicator.style.left = `${rect.left - parentRect.left}px`
        indicator.style.width = `${rect.width}px`
      }
      document.querySelectorAll('.tab-panel').forEach((p) => p.classList.remove('active'))
      const panel = document.querySelector(target)
      panel?.classList.add('active')
    })
  })
}

function ensureToastContainer(): void {
  if (typeof window === 'undefined') return
  if (document.querySelector('.toast-container')) return
  const div = document.createElement('div')
  div.className = 'toast-container'
  document.body.appendChild(div)
}

export function initGlobalAnimations(): void {
  if (typeof window === 'undefined') return
  // Always refresh reveal for newly rendered route content.
  initScrollReveal()

  // One-time global listeners/bootstraps.
  if (bootstrapDone) return
  bootstrapDone = true
  initStickyNav()
  initRippleButtons()
  initCounters()
  initTabs()
  ensureToastContainer()
}

