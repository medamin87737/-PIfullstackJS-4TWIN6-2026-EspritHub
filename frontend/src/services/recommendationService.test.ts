import { beforeEach, describe, expect, it, vi } from 'vitest'
import axios from 'axios'
import { RecommendationService } from './recommendationService'

vi.mock('axios', () => ({
  default: {
    post: vi.fn(),
  },
}))

describe('RecommendationService', () => {
  const axiosPost = vi.mocked(axios.post)

  beforeEach(() => {
    axiosPost.mockReset()
    localStorage.clear()
    ;(globalThis as any).window = globalThis
    Object.defineProperty(globalThis, 'location', {
      value: { href: '' },
      writable: true,
      configurable: true,
    })
  })

  it('updates token and posts response successfully', async () => {
    const service = new RecommendationService('t1')
    service.updateToken('t2')
    axiosPost.mockResolvedValueOnce({ data: { message: 'OK' } } as any)

    const res = await service.respondToRecommendation('rec1', 'ACCEPTED', 'yes')
    expect(res.success).toBe(true)
    expect(axiosPost).toHaveBeenCalledWith(
      '/api/recommendations/respond',
      { recommendationId: 'rec1', response: 'ACCEPTED', justification: 'yes' },
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: 'Bearer t2' }),
      }),
    )
  })

  it('handles network error (no response)', async () => {
    const service = new RecommendationService('t1')
    axiosPost.mockRejectedValueOnce({} as any)
    const res = await service.respondToRecommendation('rec1', 'REJECTED')
    expect(res.success).toBe(false)
    expect(res.error).toContain('Connexion réseau perdue')
  })

  it('handles 404/500/default errors', async () => {
    const service = new RecommendationService('t1')

    axiosPost.mockRejectedValueOnce({ response: { status: 404 } } as any)
    await expect(service.respondToRecommendation('rec1', 'REJECTED')).resolves.toMatchObject({
      success: false,
      error: expect.stringContaining('non trouvée'),
    })

    axiosPost.mockRejectedValueOnce({ response: { status: 500 } } as any)
    await expect(service.respondToRecommendation('rec1', 'REJECTED')).resolves.toMatchObject({
      success: false,
      error: expect.stringContaining('Erreur serveur'),
    })

    axiosPost.mockRejectedValueOnce({ response: { status: 418, data: { message: 'teapot' } } } as any)
    await expect(service.respondToRecommendation('rec1', 'REJECTED')).resolves.toMatchObject({
      success: false,
      error: 'teapot',
    })
  })

  it('retries on 401 when refresh succeeds', async () => {
    localStorage.setItem('refreshToken', 'r1')
    const service = new RecommendationService('t1')
    axiosPost
      .mockRejectedValueOnce({ response: { status: 401 } } as any)
      .mockResolvedValueOnce({ data: { accessToken: 'new-token' } } as any)
      .mockResolvedValueOnce({ data: { message: 'done' } } as any)

    const res = await service.respondToRecommendation('rec2', 'ACCEPTED')
    expect(res.success).toBe(true)
    expect(localStorage.getItem('accessToken')).toBe('new-token')
  })

  it('returns session expired on 401 when refresh fails and redirects', async () => {
    const service = new RecommendationService('t1')
    axiosPost.mockRejectedValueOnce({ response: { status: 401 } } as any)

    const res = await service.respondToRecommendation('rec2', 'ACCEPTED')
    expect(res.success).toBe(false)
    expect(res.error).toContain('Session expirée')
    expect((globalThis as any).location.href).toBe('/login')
  })
})

