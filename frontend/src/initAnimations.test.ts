import { afterEach, describe, expect, it, vi } from 'vitest'

describe('initGlobalAnimations', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    vi.resetModules()
    delete (window as unknown as { __skillupStickyNavInit?: boolean }).__skillupStickyNavInit
    document.body.innerHTML = ''
    document.documentElement.removeAttribute('style')
    document.documentElement.removeAttribute('class')
  })

  it('reveals elements when reduced motion is preferred', async () => {
    vi.stubGlobal(
      'matchMedia',
      vi.fn((query: string) => ({
        matches: query.includes('prefers-reduced-motion'),
        media: query,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        addListener: vi.fn(),
        removeListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    )
    const el = document.createElement('div')
    el.className = 'reveal'
    document.body.appendChild(el)
    const { initGlobalAnimations } = await import('./initAnimations')
    initGlobalAnimations()
    expect(el.classList.contains('revealed')).toBe(true)
  })

  it('bootstraps observers and UI helpers when motion is allowed', async () => {
    vi.stubGlobal(
      'matchMedia',
      vi.fn(() => ({
        matches: false,
        media: '',
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        addListener: vi.fn(),
        removeListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    )
    const header = document.createElement('header')
    document.body.appendChild(header)
    const reveal = document.createElement('div')
    reveal.className = 'reveal'
    reveal.getBoundingClientRect = vi.fn(() => ({ top: 9999 }) as DOMRect)
    document.body.appendChild(reveal)
    const btn = document.createElement('button')
    btn.className = 'btn'
    document.body.appendChild(btn)
    const counter = document.createElement('span')
    counter.setAttribute('data-target', '5')
    counter.getBoundingClientRect = vi.fn(() => ({ top: 0 }) as DOMRect)
    document.body.appendChild(counter)

    const observe = vi.fn()
    const unobserve = vi.fn()
    class MockIntersectionObserver {
      observe = observe
      unobserve = unobserve
      disconnect = vi.fn()
      constructor(_cb: IntersectionObserverCallback, _opts?: IntersectionObserverInit) {}
    }
    vi.stubGlobal('IntersectionObserver', MockIntersectionObserver as unknown as typeof IntersectionObserver)

    vi.spyOn(window, 'addEventListener').mockImplementation(() => {})

    const { initGlobalAnimations } = await import('./initAnimations')
    initGlobalAnimations()
    expect(observe).toHaveBeenCalled()
    const { initGlobalAnimations: init2 } = await import('./initAnimations')
    init2()
    expect(document.querySelector('.toast-container')).not.toBeNull()
  })

  it('scroll reveal marks in-view nodes and reveals after intersection', async () => {
    vi.stubGlobal(
      'matchMedia',
      vi.fn(() => ({
        matches: false,
        media: '',
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        addListener: vi.fn(),
        removeListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    )
    Object.defineProperty(window, 'innerHeight', { configurable: true, value: 800 })
    const callbacks: IntersectionObserverCallback[] = []
    class MultiIO {
      observe = vi.fn()
      unobserve = vi.fn()
      disconnect = vi.fn()
      constructor(cb: IntersectionObserverCallback, _opts?: IntersectionObserverInit) {
        callbacks.push(cb)
      }
    }
    vi.stubGlobal('IntersectionObserver', MultiIO as unknown as typeof IntersectionObserver)
    vi.spyOn(window, 'addEventListener').mockImplementation(() => {})

    const inView = document.createElement('div')
    inView.className = 'reveal'
    inView.getBoundingClientRect = () => ({ top: 40 } as DOMRect)
    document.body.appendChild(inView)

    const off = document.createElement('div')
    off.className = 'reveal'
    off.getBoundingClientRect = () => ({ top: 9000 } as DOMRect)
    document.body.appendChild(off)

    const { initGlobalAnimations } = await import('./initAnimations')
    initGlobalAnimations()

    expect(inView.classList.contains('revealed')).toBe(true)
    expect(callbacks[0]).toBeTypeOf('function')
    callbacks[0](
      [{ isIntersecting: true, target: off } as unknown as IntersectionObserverEntry],
      { unobserve: vi.fn() } as unknown as IntersectionObserver,
    )
    expect(off.classList.contains('revealed')).toBe(true)
  })

  it('runs ripple on button click and switches tabs', async () => {
    vi.stubGlobal(
      'matchMedia',
      vi.fn(() => ({
        matches: false,
        media: '',
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        addListener: vi.fn(),
        removeListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    )
    class IoStub {
      observe = vi.fn()
      unobserve = vi.fn()
      disconnect = vi.fn()
      constructor(_cb: IntersectionObserverCallback, _opts?: IntersectionObserverInit) {}
    }
    vi.stubGlobal('IntersectionObserver', IoStub as unknown as typeof IntersectionObserver)
    vi.spyOn(window, 'addEventListener').mockImplementation(() => {})
    const btn = document.createElement('button')
    btn.className = 'btn'
    document.body.appendChild(btn)
    const parent = document.createElement('div')
    const tab1 = document.createElement('button')
    tab1.className = 'tab-btn'
    tab1.dataset.target = '#p1'
    const tab2 = document.createElement('button')
    tab2.className = 'tab-btn'
    tab2.dataset.target = '#p2'
    const indicator = document.createElement('div')
    indicator.className = 'tab-indicator'
    parent.appendChild(tab1)
    parent.appendChild(tab2)
    parent.appendChild(indicator)
    document.body.appendChild(parent)
    const p1 = document.createElement('div')
    p1.id = 'p1'
    p1.className = 'tab-panel active'
    const p2 = document.createElement('div')
    p2.id = 'p2'
    p2.className = 'tab-panel'
    document.body.appendChild(p1)
    document.body.appendChild(p2)
    tab1.getBoundingClientRect = () => ({ left: 10, width: 40 } as DOMRect)
    parent.getBoundingClientRect = () => ({ left: 0 } as DOMRect)

    const { initGlobalAnimations } = await import('./initAnimations')
    initGlobalAnimations()

    btn.dispatchEvent(
      new MouseEvent('click', { bubbles: true, clientX: 12, clientY: 8 } as MouseEventInit),
    )
    expect(btn.querySelector('.ripple')).not.toBeNull()

    tab2.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    expect(p2.classList.contains('active')).toBe(true)
    expect(p1.classList.contains('active')).toBe(false)
  })

  it('animates counter to target with fake timers', async () => {
    vi.stubGlobal(
      'matchMedia',
      vi.fn(() => ({
        matches: false,
        media: '',
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        addListener: vi.fn(),
        removeListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    )
    vi.useFakeTimers()

    const counter = document.createElement('span')
    counter.setAttribute('data-target', '3')
    counter.getBoundingClientRect = vi.fn(() => ({ top: 0 }) as DOMRect)
    document.body.appendChild(counter)

    class MockIO {
      unobserve = vi.fn()
      disconnect = vi.fn()
      private readonly callback: IntersectionObserverCallback
      constructor(callback: IntersectionObserverCallback, _opts?: IntersectionObserverInit) {
        this.callback = callback
      }
      observe = vi.fn((target: Element) => {
        queueMicrotask(() => {
          this.callback(
            [{ isIntersecting: true, target } as IntersectionObserverEntry],
            this as unknown as IntersectionObserver,
          )
        })
      })
    }
    vi.stubGlobal('IntersectionObserver', MockIO as unknown as typeof IntersectionObserver)

    const { initGlobalAnimations } = await import('./initAnimations')
    initGlobalAnimations()

    await vi.runAllTimersAsync()
    await vi.advanceTimersByTimeAsync(2000)
    expect(counter.textContent).toContain('3')
    vi.useRealTimers()
  })
})
