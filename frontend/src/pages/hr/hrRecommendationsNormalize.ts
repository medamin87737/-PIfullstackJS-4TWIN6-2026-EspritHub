export type NormalizedParsedActivity = {
  titre: string
  description: string
  contexte: string
  required_skills: { intitule: string; niveau_requis: number; poids: number }[]
  top_n: number
}

export function normalizeParsedActivity(raw: unknown): NormalizedParsedActivity | null {
  if (!raw || typeof raw !== 'object') return null
  const o = raw as Record<string, unknown>
  const requiredSkills = Array.isArray(o.required_skills) ? o.required_skills : []
  return {
    titre: String(o.titre ?? o.title ?? ''),
    description: String(o.description ?? ''),
    contexte: String(o.contexte ?? ''),
    required_skills: requiredSkills.map((s: unknown) => {
      const sk = (s ?? {}) as Record<string, unknown>
      return {
        intitule: String(sk?.intitule ?? sk?.skill_name ?? ''),
        niveau_requis: Number(sk?.niveau_requis ?? 0),
        poids: Number(sk?.poids ?? 0),
      }
    }),
    top_n: Number(o.top_n ?? 0),
  }
}

export function normalizeScore(value: unknown): number {
  const n = Number(value ?? 0)
  if (!Number.isFinite(n)) return 0
  if (n > 1) return n / 100
  if (n < 0) return 0
  return n
}

export function formatScorePercent(value: unknown): string {
  return `${(normalizeScore(value) * 100).toFixed(1)}%`
}

export function normalizeSkillKey(value: unknown): string {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ')
}

export function extractMissingSkillsFromError(errorMessage: string): string[] {
  const msg = String(errorMessage ?? '').trim()
  if (!msg) return []
  const direct = msg.match(/comp[eé]tence\(s\)\s+non\s+trouv[ée]e\(s\)\s*:\s*([^\n]+)/i)?.[1]
  const candidate = String(direct ?? msg)
    .replace(/v[eé]rifiez.*$/i, '')
    .replace(/donn[eé]es.*$/i, '')
    .replace(/\.$/, '')
    .trim()
  if (!candidate) return []
  return candidate
    .split(/[;,]/)
    .map((s) => s.trim())
    .filter((s) => s.length > 1)
}

export function extractTopNFromPrompt(prompt: string): number | null {
  const text = String(prompt ?? '')
  const structured = text.match(/\btop[_\s-]*n\s*[:=]?\s*(\d{1,4})\b/i)?.[1]
  const natural = text.match(/\b(trouver|trouve|chercher|cherche|identifier|identifie)\s+(\d{1,4})\s+profils?\b/i)?.[2]
  const raw = Number(structured ?? natural ?? 0)
  if (!Number.isFinite(raw) || raw <= 0) return null
  return Math.max(1, Math.min(500, raw))
}

export function extractPromptSkillCandidates(prompt: string): string[] {
  const text = String(prompt ?? '')
  if (!text.trim()) return []

  const cleanSkill = (raw: string): string => {
    return String(raw ?? '')
      .replace(/^[\s\-•*–—]+/, '')
      .replace(/[.,;:!?]+$/g, '')
      .replace(/\s*(niveau|level|niv|lvl|n\.?)\s*[1-5]\s*$/i, '')
      .replace(/\s+/g, ' ')
      .trim()
  }

  const bulletMatches = Array.from(text.matchAll(/^\s*-\s*([^\n]+)/gim))
    .map((m) => cleanSkill(String(m?.[1] ?? '')))
    .filter(Boolean)

  const lineMatches = Array.from(text.matchAll(/(?:^|[\n;])\s*([^\n;]{2,120}?)\s*(?:niveau|level|niv|lvl|n\.?)\s*[1-5]/gi))
    .map((m) => cleanSkill(String(m?.[1] ?? '')))
    .filter(Boolean)

  const splitCompoundSkills = (value: string): string[] => {
    const v = cleanSkill(value)
    if (!v) return []
    const parts = v
      .split(/\s*(?:\/|\||\bet\b|&)\s*/i)
      .map((p) => cleanSkill(p))
      .filter(Boolean)
    return parts.length > 0 ? parts : [v]
  }

  const merged = [...bulletMatches, ...lineMatches].flatMap(splitCompoundSkills)
  const unique = new Map<string, string>()
  for (const s of merged) {
    const key = normalizeSkillKey(s)
    if (!key) continue
    if (!unique.has(key)) unique.set(key, s)
  }
  return Array.from(unique.values())
}
