import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { Chatbot } from './Chatbot'

const sendMessage = vi.fn()

vi.mock('../services/chatService', () => ({
  chatService: {
    sendMessage: (...args: unknown[]) => sendMessage(...args) as Promise<string>,
  },
}))

function setInputValue(el: HTMLInputElement, value: string) {
  const desc = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')
  if (desc?.set) desc.set.call(el, value)
  else el.value = value
  el.dispatchEvent(new Event('input', { bubbles: true }))
}

describe('Chatbot', () => {
  let container: HTMLDivElement
  let root: ReturnType<typeof createRoot>
  const onClose = vi.fn()

  beforeEach(() => {
    sendMessage.mockReset()
    onClose.mockReset()
    Element.prototype.scrollIntoView = vi.fn() as typeof Element.prototype.scrollIntoView
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
  })

  afterEach(() => {
    act(() => root.unmount())
    container.remove()
  })

  it('shows configuration error when activityId is missing', async () => {
    await act(async () => {
      root.render(<Chatbot activityId="" />)
    })
    expect(container.textContent).toContain('Aucune activité')
  })

  it('sends message on submit and renders bot reply', async () => {
    sendMessage.mockResolvedValueOnce('Réponse bot')
    await act(async () => {
      root.render(<Chatbot activityId="act-1" />)
    })
    const input = container.querySelector('input') as HTMLInputElement
    await act(async () => {
      setInputValue(input, 'Bonjour')
    })
    const sendBtn = container.querySelector('.chatbot-send-btn') as HTMLButtonElement
    await act(async () => {
      sendBtn.click()
    })
    await act(async () => {
      await Promise.resolve()
    })
    expect(sendMessage).toHaveBeenCalledWith('Bonjour', 'act-1')
    expect(container.textContent).toContain('Réponse bot')
  })

  it('maps non-Error failures to generic bot message', async () => {
    sendMessage.mockRejectedValueOnce('weird')
    await act(async () => {
      root.render(<Chatbot activityId="a1" />)
    })
    const input = container.querySelector('input') as HTMLInputElement
    await act(async () => {
      setInputValue(input, 'x')
    })
    await act(async () => {
      ;(container.querySelector('.chatbot-send-btn') as HTMLButtonElement).click()
    })
    await act(async () => {
      await Promise.resolve()
    })
    expect(container.textContent).toMatch(/Désolé/)
  })

  it('ignores empty submit', async () => {
    await act(async () => {
      root.render(<Chatbot activityId="a1" />)
    })
    await act(async () => {
      ;(container.querySelector('form') as HTMLFormElement).requestSubmit()
    })
    expect(sendMessage).not.toHaveBeenCalled()
  })

  it('fires quick suggestion on button click', async () => {
    sendMessage.mockResolvedValue('ok')
    await act(async () => {
      root.render(<Chatbot activityId="a1" />)
    })
    const suggestionBtn = container.querySelector('.suggestion-btn') as HTMLButtonElement
    await act(async () => {
      suggestionBtn.click()
    })
    expect(sendMessage).toHaveBeenCalled()
  })

  it('calls onClose from header button', async () => {
    await act(async () => {
      root.render(<Chatbot activityId="a1" onClose={onClose} />)
    })
    await act(async () => {
      ;(container.querySelector('.chatbot-close-btn') as HTMLButtonElement).click()
    })
    expect(onClose).toHaveBeenCalled()
  })

  it('submits on Enter without Shift', async () => {
    sendMessage.mockResolvedValue('r')
    await act(async () => {
      root.render(<Chatbot activityId="a1" />)
    })
    const input = container.querySelector('input') as HTMLInputElement
    await act(async () => {
      setInputValue(input, 'msg')
    })
    await act(async () => {
      input.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Enter', shiftKey: false, bubbles: true }),
      )
    })
    await act(async () => {
      await Promise.resolve()
    })
    expect(sendMessage).toHaveBeenCalledWith('msg', 'a1')
  })
})
