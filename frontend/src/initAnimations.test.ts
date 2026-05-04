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
})
