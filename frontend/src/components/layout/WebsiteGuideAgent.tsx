import { useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { createPortal } from 'react-dom'
import {
  Award,
  BarChart3,
  Bell,
  Bot,
  ClipboardList,
  ExternalLink,
  FileText,
  FolderOpen,
  LayoutDashboard,
  Maximize2,
  Minimize2,
  Send,
  Sparkles,
  UserCircle,
  Users,
  X,
} from 'lucide-react'
import { askWebsiteGuide } from '../../api/chat'
import { useAuth } from '../../context/AuthContext'

type ChatItem = {
  id: string
  sender: 'user' | 'bot'
  text: string
  createdAt: Date
}

const QUICK_PROMPTS = [
  'Comment utiliser cette page ?',
  'Quelles actions faire en premier ?',
  'Ou trouver les fonctionnalites principales ?',
]

const INTERNAL_PATH_REGEX = /(\/(?:admin|hr|manager|employee)\/[A-Za-z0-9\-/_?=&%]*)/g
const URL_REGEX = /(https?:\/\/[^\s)]+)/g

function createId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function extractUniqueMatches(text: string, regex: RegExp): string[] {
  const matches = text.match(regex) ?? []
  return Array.from(new Set(matches.map((m) => m.trim())))
}

function getPathLabel(path: string): string {
  if (path.includes('/dashboard')) return 'Dashboard'
  if (path.includes('/activities')) return 'Activites'
  if (path.includes('/reports')) return 'Rapports'
  if (path.includes('/notifications')) return 'Notifications'
  if (path.includes('/profile')) return 'Profil'
  if (path.includes('/analytics')) return 'Analytiques'
  if (path.includes('/history')) return 'Historique'
  if (path.includes('/users')) return 'Utilisateurs'
  if (path.includes('/validations')) return 'Validations'
  if (path.includes('/activity-requests')) return 'Demandes activite'
  if (path.includes('/certificates')) return 'Certificats'
  return path
}

function getPathIcon(path: string) {
  if (path.includes('/dashboard')) return LayoutDashboard
  if (path.includes('/activities')) return ClipboardList
  if (path.includes('/reports')) return FileText
  if (path.includes('/notifications')) return Bell
  if (path.includes('/profile')) return UserCircle
  if (path.includes('/analytics')) return BarChart3
  if (path.includes('/history')) return FolderOpen
  if (path.includes('/users')) return Users
  if (path.includes('/validations')) return ClipboardList
  if (path.includes('/certificates')) return Award
  return Sparkles
}

export default function WebsiteGuideAgent() {
  const { user } = useAuth()
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [typingMessageId, setTypingMessageId] = useState<string | null>(null)
  const [messages, setMessages] = useState<ChatItem[]>([
    {
      id: createId(),
      sender: 'bot',
      text: 'Bonjour, je suis AgentWebsite. Je peux vous guider pour utiliser cette page et naviguer dans le site.',
      createdAt: new Date(),
    },
  ])
  const containerRef = useRef<HTMLDivElement | null>(null)

  const role = user?.role

  const canSend = useMemo(() => input.trim().length > 0 && !loading, [input, loading])

  const scrollToBottom = () => {
    const el = containerRef.current
    if (!el) return
    requestAnimationFrame(() => {
      el.scrollTop = el.scrollHeight
    })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages, loading])

  useEffect(() => {
    if (!open || !isFullscreen) return
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [open, isFullscreen])

  const sendQuestion = async (text: string) => {
    const question = text.trim()
    if (!question || !role) return

    const userMsg: ChatItem = { id: createId(), sender: 'user', text: question, createdAt: new Date() }
    setMessages((prev) => [...prev, userMsg])
    setInput('')
    setLoading(true)
    scrollToBottom()

    try {
      const res = await askWebsiteGuide({
        message: question,
        currentPath: pathname,
        userRole: role,
        language: 'fr',
      })

      await typeBotMessageWordByWord(res.reply)
    } catch (error: any) {
      await typeBotMessageWordByWord(`Je ne peux pas repondre pour le moment: ${error?.message ?? 'erreur reseau'}.`)
    } finally {
      setLoading(false)
      scrollToBottom()
    }
  }

  const typeBotMessageWordByWord = async (fullText: string) => {
    const id = createId()
    const createdAt = new Date()

    setMessages((prev) => [...prev, { id, sender: 'bot', text: '', createdAt }])
    setTypingMessageId(id)

    const tokens = fullText.split(/(\s+)/)
    let current = ''
    for (const token of tokens) {
      current += token
      setMessages((prev) => prev.map((m) => (m.id === id ? { ...m, text: current } : m)))

      if (token.trim().length > 0) {
        const delay = Math.max(24, Math.min(85, 80 - token.length))
        await new Promise((resolve) => setTimeout(resolve, delay))
      }
    }

    setTypingMessageId(null)
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="agent-website-trigger button-micro flex items-center gap-2 rounded-lg border border-input bg-background px-2.5 py-1.5 text-xs font-medium text-foreground hover:bg-accent"
        aria-label="Ouvrir AgentWebsite"
      >
        <span className="relative">
          <Bot className="h-4 w-4 text-primary" />
          <span className="agent-website-live-dot" aria-hidden="true" />
        </span>
        <span className="hidden md:inline">AgentWebsite</span>
      </button>

      {open && !isFullscreen && (
        <div className="agent-website-panel absolute right-0 top-full z-50 mt-2 flex w-[380px] max-w-[92vw] flex-col overflow-hidden rounded-2xl border border-border/80 bg-card shadow-2xl animate-slide-up">
          <div className="agent-website-header flex items-center justify-between border-b border-border/80 px-3 py-2.5">
            <div className="flex items-center gap-2.5">
              <div className="agent-website-avatar">
                <Bot className="h-4 w-4 text-primary-foreground" />
              </div>
              <div>
                <p className="text-sm font-semibold text-card-foreground">AgentWebsite</p>
                <p className="text-[10px] text-muted-foreground">Guide IA de navigation</p>
              </div>
              <span className="agent-website-status hidden sm:inline-flex">
                <Sparkles className="h-3 w-3" />
                En ligne
              </span>
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setIsFullscreen((prev) => !prev)}
                className="rounded p-1 text-muted-foreground transition-colors hover:bg-accent"
                aria-label={isFullscreen ? 'Quitter le mode plein ecran' : 'Activer le mode plein ecran'}
              >
                {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
              </button>
              <button
                type="button"
                onClick={() => {
                  setOpen(false)
                  setIsFullscreen(false)
                }}
                className="rounded p-1 text-muted-foreground transition-colors hover:bg-accent"
                aria-label="Fermer AgentWebsite"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div ref={containerRef} className="agent-website-messages max-h-80 space-y-2 overflow-y-auto p-3">
            {messages.map((msg, idx) => (
              <div
                key={msg.id}
                style={{ animationDelay: `${Math.min(idx * 35, 250)}ms` }}
                className={`agent-website-bubble max-w-[90%] rounded-2xl px-3 py-2 text-xs leading-relaxed ${
                  msg.sender === 'user'
                    ? 'agent-website-bubble-user ml-auto'
                    : 'agent-website-bubble-bot'
                }`}
              >
                {msg.sender === 'bot' && (
                  <div className="mb-1.5 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
                    <Bot className="h-3 w-3" />
                    Assistant guide
                  </div>
                )}

                <p className="whitespace-pre-wrap">
                  {msg.text}
                  {typingMessageId === msg.id && <span className="agent-website-type-cursor" aria-hidden="true">|</span>}
                </p>

                {msg.sender === 'bot' && (
                  <div className="mt-2 space-y-2">
                    {extractUniqueMatches(msg.text, INTERNAL_PATH_REGEX).length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {extractUniqueMatches(msg.text, INTERNAL_PATH_REGEX).slice(0, 6).map((path) => {
                          const Icon = getPathIcon(path)
                          return (
                            <button
                              key={path}
                              type="button"
                              className="agent-website-link-chip"
                              onClick={() => {
                                navigate(path)
                                setIsFullscreen(false)
                                setOpen(false)
                              }}
                              title={`Aller vers ${path}`}
                            >
                              <Icon className="h-3.5 w-3.5" />
                              <span>{getPathLabel(path)}</span>
                            </button>
                          )
                        })}
                      </div>
                    )}

                    {extractUniqueMatches(msg.text, URL_REGEX).length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {extractUniqueMatches(msg.text, URL_REGEX).slice(0, 4).map((url) => (
                          <a
                            key={url}
                            href={url}
                            target="_blank"
                            rel="noreferrer"
                            className="agent-website-ext-chip"
                            title={url}
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                            <span>Lien externe</span>
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                )}
                <div
                  className={`mt-1 flex items-center gap-1 text-[10px] ${
                    msg.sender === 'user' ? 'justify-end text-primary-foreground/80' : 'justify-start text-muted-foreground'
                  }`}
                >
                  <span>
                    {msg.createdAt.toLocaleTimeString('fr-FR', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                  {msg.sender === 'user' && <span className="agent-website-double-tick">✓✓</span>}
                </div>
              </div>
            ))}
            {loading && (
              <div className="agent-website-bubble max-w-[90%] rounded-xl bg-muted/90 px-3 py-2 text-xs text-muted-foreground">
                <div className="flex items-center gap-2">
                  <span>AgentWebsite reflechit</span>
                  <span className="agent-website-typing" aria-hidden="true">
                    <span />
                    <span />
                    <span />
                  </span>
                </div>
              </div>
            )}
          </div>

          <div className="border-t border-border/80 bg-card/70 p-3 backdrop-blur-sm">
            <div className="mb-2 flex flex-wrap gap-1.5">
              {QUICK_PROMPTS.map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  onClick={() => void sendQuestion(prompt)}
                  disabled={loading}
                  className="agent-website-chip rounded-full border border-input bg-background px-2.5 py-1 text-[11px] text-foreground hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {prompt}
                </button>
              ))}
            </div>
            <form
              className="agent-website-input-wrap flex items-center gap-2 rounded-xl border border-input bg-background p-1"
              onSubmit={(e) => {
                e.preventDefault()
                void sendQuestion(input)
              }}
            >
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ecrivez votre question..."
                className="h-9 flex-1 rounded-md bg-transparent px-2.5 text-xs outline-none ring-0 placeholder:text-muted-foreground"
              />
              <button
                type="submit"
                disabled={!canSend}
                className="agent-website-send flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground disabled:opacity-50"
                aria-label="Envoyer a AgentWebsite"
              >
                <Send className="h-4 w-4" />
              </button>
            </form>
          </div>
        </div>
      )}

      {open && isFullscreen && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[140] bg-black/45 p-4 backdrop-blur-sm animate-fade-in">
          <div className="mx-auto flex h-full w-full max-w-6xl items-center justify-center">
            <div className="agent-website-panel flex h-full w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-border/80 bg-card shadow-2xl">
              <div className="agent-website-header flex items-center justify-between border-b border-border/80 px-3 py-2.5">
                <div className="flex items-center gap-2.5">
                  <div className="agent-website-avatar">
                    <Bot className="h-4 w-4 text-primary-foreground" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-card-foreground">AgentWebsite</p>
                    <p className="text-[10px] text-muted-foreground">Guide IA de navigation</p>
                  </div>
                  <span className="agent-website-status hidden sm:inline-flex">
                    <Sparkles className="h-3 w-3" />
                    En ligne
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setIsFullscreen(false)}
                    className="rounded p-1 text-muted-foreground transition-colors hover:bg-accent"
                    aria-label="Quitter le mode plein ecran"
                  >
                    <Minimize2 className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setOpen(false)
                      setIsFullscreen(false)
                    }}
                    className="rounded p-1 text-muted-foreground transition-colors hover:bg-accent"
                    aria-label="Fermer AgentWebsite"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div ref={containerRef} className="agent-website-messages min-h-0 flex-1 space-y-2 overflow-y-auto p-3">
                {messages.map((msg, idx) => (
                  <div
                    key={msg.id}
                    style={{ animationDelay: `${Math.min(idx * 35, 250)}ms` }}
                    className={`agent-website-bubble max-w-[92%] rounded-2xl px-3 py-2 text-xs leading-relaxed ${
                      msg.sender === 'user'
                        ? 'agent-website-bubble-user ml-auto'
                        : 'agent-website-bubble-bot'
                    }`}
                  >
                    {msg.sender === 'bot' && (
                      <div className="mb-1.5 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
                        <Bot className="h-3 w-3" />
                        Assistant guide
                      </div>
                    )}

                    <p className="whitespace-pre-wrap">
                      {msg.text}
                      {typingMessageId === msg.id && <span className="agent-website-type-cursor" aria-hidden="true">|</span>}
                    </p>

                    {msg.sender === 'bot' && (
                      <div className="mt-2 space-y-2">
                        {extractUniqueMatches(msg.text, INTERNAL_PATH_REGEX).length > 0 && (
                          <div className="flex flex-wrap gap-1.5">
                            {extractUniqueMatches(msg.text, INTERNAL_PATH_REGEX).slice(0, 6).map((path) => {
                              const Icon = getPathIcon(path)
                              return (
                                <button
                                  key={path}
                                  type="button"
                                  className="agent-website-link-chip"
                                  onClick={() => {
                                    navigate(path)
                                    setIsFullscreen(false)
                                    setOpen(false)
                                  }}
                                  title={`Aller vers ${path}`}
                                >
                                  <Icon className="h-3.5 w-3.5" />
                                  <span>{getPathLabel(path)}</span>
                                </button>
                              )
                            })}
                          </div>
                        )}

                        {extractUniqueMatches(msg.text, URL_REGEX).length > 0 && (
                          <div className="flex flex-wrap gap-1.5">
                            {extractUniqueMatches(msg.text, URL_REGEX).slice(0, 4).map((url) => (
                              <a
                                key={url}
                                href={url}
                                target="_blank"
                                rel="noreferrer"
                                className="agent-website-ext-chip"
                                title={url}
                              >
                                <ExternalLink className="h-3.5 w-3.5" />
                                <span>Lien externe</span>
                              </a>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                    <div
                      className={`mt-1 flex items-center gap-1 text-[10px] ${
                        msg.sender === 'user' ? 'justify-end text-primary-foreground/80' : 'justify-start text-muted-foreground'
                      }`}
                    >
                      <span>
                        {msg.createdAt.toLocaleTimeString('fr-FR', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                      {msg.sender === 'user' && <span className="agent-website-double-tick">✓✓</span>}
                    </div>
                  </div>
                ))}
                {loading && (
                  <div className="agent-website-bubble max-w-[92%] rounded-xl bg-muted/90 px-3 py-2 text-xs text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <span>AgentWebsite reflechit</span>
                      <span className="agent-website-typing" aria-hidden="true">
                        <span />
                        <span />
                        <span />
                      </span>
                    </div>
                  </div>
                )}
              </div>

              <div className="border-t border-border/80 bg-card/70 p-3 backdrop-blur-sm">
                <div className="mb-2 flex flex-wrap gap-1.5">
                  {QUICK_PROMPTS.map((prompt) => (
                    <button
                      key={prompt}
                      type="button"
                      onClick={() => void sendQuestion(prompt)}
                      disabled={loading}
                      className="agent-website-chip rounded-full border border-input bg-background px-2.5 py-1 text-[11px] text-foreground hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
                <form
                  className="agent-website-input-wrap flex items-center gap-2 rounded-xl border border-input bg-background p-1"
                  onSubmit={(e) => {
                    e.preventDefault()
                    void sendQuestion(input)
                  }}
                >
                  <input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Ecrivez votre question..."
                    className="h-9 flex-1 rounded-md bg-transparent px-2.5 text-xs outline-none ring-0 placeholder:text-muted-foreground"
                  />
                  <button
                    type="submit"
                    disabled={!canSend}
                    className="agent-website-send flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground disabled:opacity-50"
                    aria-label="Envoyer a AgentWebsite"
                  >
                    <Send className="h-4 w-4" />
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>,
        document.body,
      )}
    </div>
  )
}

