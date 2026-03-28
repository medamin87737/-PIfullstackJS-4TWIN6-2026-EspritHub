import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { Eye, EyeOff, LogIn, AlertCircle, Mail, Lock, UserRound, KeyRound } from 'lucide-react'
import type { UserRole } from '../types'
import { useAccessibility } from '../context/AccessibilityContext'
import { useTranslation } from '../context/TranslationContext'

const roleRoutes: Record<UserRole, string> = {
  ADMIN: '/admin/dashboard',
  HR: '/hr/dashboard',
  MANAGER: '/manager/dashboard',
  EMPLOYEE: '/employee/dashboard',
}
export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [rememberMe, setRememberMe] = useState(true)
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { login, user } = useAuth()
  const { t, language, setLanguage, isTranslating, supportedLanguages, translatePage } = useTranslation()
  const navigate = useNavigate()

  useEffect(() => {
    if (loading) return
    const rememberedUser = user ?? JSON.parse(localStorage.getItem('auth_user') || 'null')
    if (rememberedUser?.role) {
      navigate(roleRoutes[rememberedUser.role as UserRole] || '/login', { replace: true })
    }
  }, [loading, navigate, user])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!email) { setError(t('errorMissingEmail')); return }
    if (!password) { setError(t('errorMissingPassword')); return }

    setLoading(true)
    const result = await login(email, password, rememberMe)

    if (result.success) {
      setTimeout(() => {
        setLoading(false)
        const finalUser =
          user ??
          JSON.parse(localStorage.getItem('auth_user') || sessionStorage.getItem('auth_user') || '{}')
        if (finalUser && finalUser.role) {
          navigate(roleRoutes[finalUser.role as UserRole] || '/login')
        } else {
          setError(t('errorRole'))
        }
      }, 2000)
    } else {
      setLoading(false)
      setError(result.message || t('errorLogin'))
    }
  }

  const normalizeSpokenEmail = (input: string) => {
    let value = input.trim().toLowerCase()
    value = value
      .replace(/\bat\b/g, '@')
      .replace(/\barobase\b/g, '@')
      .replace(/\bpoint\b/g, '.')
      .replace(/\bdot\b/g, '.')
      .replace(/\s+/g, '')
    return value
  }

  // Voice commands: email / password dictation + submit
  useEffect(() => {
    const handler = (event: Event) => {
      const detail = (event as CustomEvent).detail as
        | { type?: string; value?: string; command?: string }
        | undefined
      if (!detail) return

      if (detail.type === 'submit') {
        const form = document.querySelector<HTMLFormElement>('[data-accessibility-login="true"]')
        form?.requestSubmit()
        return
      }

      if (detail.type === 'email' && detail.value) {
        setEmail((prev) => (prev ? prev : normalizeSpokenEmail(detail.value!)))
        return
      }

      if (detail.type === 'password' && detail.value) {
        setPassword((prev) => (prev ? prev : detail.value!))
      }
    }

    window.addEventListener('skillup-voice-command', handler as EventListener)
    return () => window.removeEventListener('skillup-voice-command', handler as EventListener)
  }, [])

  return (
    <div className="flex min-h-screen">
      <div className="relative hidden flex-1 items-center justify-center bg-[#0B3B8A] px-12 py-16 text-white lg:flex overflow-hidden">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -left-40 -top-40 h-80 w-80 rounded-full bg-white/10 blur-[1px] hero-circle-left" />
          <div className="absolute -right-40 -bottom-40 h-80 w-80 rounded-full bg-[#FF7A1A] opacity-25 blur-[1px] hero-circle-right" />
          <div className="absolute left-1/2 top-1/3 h-[360px] w-[360px] -translate-x-1/2 rounded-full bg-white/8 hero-circle-soft" />
        </div>

        <div className="relative z-10 max-w-xl">
          <div className="mb-10 flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#FF7A1A] text-3xl font-bold text-white shadow-xl">
              <svg
                viewBox="0 0 24 24"
                className="h-8 w-8 text-white"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <polyline points="13 3 7 14 11 14 9 21 17 9 13 9 15 3" />
              </svg>
            </div>
            <span className="text-3xl font-bold tracking-wide">SkillUpTn</span>
          </div>

          <h2 className="mb-4 text-2xl font-semibold">
            {t('login.heroTitle')}
          </h2>
          <p className="mb-6 text-sm leading-relaxed text-white/85">
            {t('login.heroBody')}
          </p>
          <p className="text-xs font-medium uppercase tracking-[0.25em] text-white/60">
            {t('login.heroPills')}
          </p>
        </div>
      </div>

      <div className="relative flex flex-1 bg-background px-0 py-0 lg:px-0 lg:py-0">
        {loading && (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-background/70 backdrop-blur-sm animate-fade-in">
            <div className="loader-panel flex flex-col items-center gap-4">
              <div className="loader-pulse-dots" aria-hidden="true">
                <span />
                <span />
                <span />
              </div>
              <div className="loader-bars" aria-hidden="true">
                <span className="bar bar-1" />
                <span className="bar bar-2" />
                <span className="bar bar-3" />
                <span className="bar bar-4" />
              </div>
              <p className="text-xs font-medium tracking-[0.25em] text-shimmer">AUTHENTIFICATION</p>
            </div>
          </div>
        )}
        {/* Visual intelligent separator between left and right */}
        <div className="auth-separator" aria-hidden="true" />
        {/* Full right-side auth panel */}
        <div className="flex w-full min-h-screen flex-col overflow-y-auto bg-card p-6 shadow-xl border-0 animate-slide-up">
          <div className="mb-6 flex flex-col items-center gap-2">
            <div className="relative flex h-14 w-14 items-center justify-center rounded-2xl shadow-sm">
              <span className="absolute inset-0 rounded-2xl border border-primary/50 animate-pulse" />
              <span className="absolute -inset-1 rounded-2xl border border-primary/25" />
              <UserRound className="relative z-10 h-7 w-7 text-primary" />
            </div>
            <div className="flex flex-col items-center">
              <span className="text-base font-semibold text-primary">Connexion</span>
              <span className="text-[11px] text-muted-foreground">Veuillez vous identifier</span>
            </div>
          </div>

          {error && (
            <div className="mb-4 flex items-center gap-2 rounded-lg border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-4" data-accessibility-login="true">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="email" className="flex items-center gap-2">
                <span className="relative flex h-8 w-8 items-center justify-center rounded-lg">
                  <span className="absolute inset-0 rounded-lg border border-primary/40" />
                  <Mail className="relative z-10 h-4 w-4 text-primary" />
                </span>
                <span className="text-sm font-semibold text-muted-foreground">{t('email')}</span>
              </label>
              <input
                id="email"
                type="email"
                placeholder={t('emailPlaceholder')}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-11 w-full rounded-lg border border-input bg-background px-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="password" className="flex items-center gap-2">
                <span className="relative flex h-8 w-8 items-center justify-center rounded-lg">
                  <span className="absolute inset-0 rounded-lg border border-primary/40" />
                  <Lock className="relative z-10 h-4 w-4 text-primary" />
                </span>
                <span className="text-sm font-semibold text-muted-foreground">{t('password')}</span>
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder={t('passwordPlaceholder')}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-11 w-full rounded-lg border border-input bg-background px-4 pr-10 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div className="flex justify-end">
              <a
                href="#"
                className="inline-flex items-center gap-2 text-xs font-medium text-muted-foreground transition-all hover:text-primary hover:underline"
              >
                <span className="relative flex h-6 w-6 items-center justify-center rounded-md bg-muted">
                  <span className="absolute inset-0 rounded-md border border-primary/40 animate-pulse" />
                  <KeyRound className="relative z-10 h-3.5 w-3.5 text-primary" />
                </span>
                <span>Mot de passe oublie ?</span>
              </a>
            </div>

            <label className="flex items-center gap-2 text-sm text-muted-foreground">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="h-4 w-4 rounded border-border"
              />
              Se souvenir de moi
            </label>

            <button
              type="submit"
              disabled={loading}
              className="mt-2 flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-primary font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {loading ? (
                <div className="loader-pulse-dots loader-pulse-dots-inline" aria-hidden="true">
                  <span />
                  <span />
                  <span />
                </div>
              ) : (
                <>
                  <LogIn className="h-4 w-4" />
                  {t('submit')}
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
