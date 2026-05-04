import { beforeEach, describe, expect, it, vi } from 'vitest'
import { chatService } from './chatService'

function mkResponse(ok: boolean, status: number, payload: any) {
  return {
    ok,
    status,
    json: async () => payload,
  }
}

describe('chatService', () => {
  const fetchMock = vi.fn()

  beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock)
    fetchMock.mockReset()
  })

  it('returns message on success', async () => {
    fetchMock.mockResolvedValueOnce(mkResponse(true, 200, { message: 'hello bot' }))
    await expect(chatService.sendMessage('hi', 'a1')).resolves.toBe('hello bot')
  })

  it('maps 400/404/503 and generic errors', async () => {
    fetchMock.mockResolvedValueOnce(mkResponse(false, 400, {}))
    await expect(chatService.sendMessage('x', '1')).rejects.toThrow("Message ou ID d'activité invalide")

    fetchMock.mockResolvedValueOnce(mkResponse(false, 404, {}))
    await expect(chatService.sendMessage('x', '1')).rejects.toThrow('Activité non trouvée')

    fetchMock.mockResolvedValueOnce(mkResponse(false, 503, {}))
    await expect(chatService.sendMessage('x', '1')).rejects.toThrow('temporairement indisponible')

    fetchMock.mockResolvedValueOnce(mkResponse(false, 500, {}))
    await expect(chatService.sendMessage('x', '1')).rejects.toThrow("Une erreur est survenue lors de l'envoi du message")
  })

  it('throws generic connection error for non-Error throws', async () => {
    fetchMock.mockRejectedValueOnce('network down')
    await expect(chatService.sendMessage('x', '1')).rejects.toThrow('Erreur de connexion au serveur')
  })
})

