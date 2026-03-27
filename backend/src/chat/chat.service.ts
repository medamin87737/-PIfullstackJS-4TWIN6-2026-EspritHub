import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RewritePromptDto } from './dto/rewrite-prompt.dto';
import { GenerateActivityPromptDto } from './dto/generate-activity-prompt.dto';

type OpenRouterChatCompletionResponse = {
  choices?: Array<{
    message?: { content?: string };
  }>;
  error?: { message?: string };
};

@Injectable()
export class ChatService {
  constructor(private readonly configService: ConfigService) {}

  private mapDesiredLevelToNiveau(level?: string): number {
    switch ((level ?? '').toLowerCase()) {
      case 'low':
        return 2;
      case 'medium':
        return 3;
      case 'high':
        return 4;
      case 'expert':
        return 5;
      default:
        return 3;
    }
  }

  private mapPriorityToBusinessContext(priority?: string): 'upskill_low' | 'consolidate_medium' | 'exploit_expert' {
    const p = String(priority ?? '').toLowerCase();
    if (p.includes('upskill') || p.includes('low')) return 'upskill_low';
    if (p.includes('expert') || p.includes('critical') || p.includes('high')) return 'exploit_expert';
    return 'consolidate_medium';
  }

  private sanitizeOpenRouterJson(raw: string): string {
    let text = raw.trim();
    if (text.startsWith('```')) {
      text = text.replace(/^```(?:json)?/i, '').replace(/```$/i, '').trim();
    }

    const parsed = JSON.parse(text) as {
      titre?: unknown;
      description?: unknown;
      required_skills?: unknown;
      top_n?: unknown;
      contexte?: unknown;
    };

    const contexteRaw = String(parsed.contexte ?? 'development').toLowerCase();
    const contexte =
      contexteRaw === 'upskilling' || contexteRaw === 'expertise' || contexteRaw === 'development'
        ? contexteRaw
        : 'development';

    const topN = Math.max(1, Math.min(50, Number(parsed.top_n ?? 10) || 10));

    const rawSkills = Array.isArray(parsed.required_skills) ? parsed.required_skills : [];
    const normalizedSkills = rawSkills
      .map((s) => {
        const skill = s as { intitule?: unknown; niveau_requis?: unknown; poids?: unknown };
        const intitule = String(skill.intitule ?? '').trim();
        if (!intitule) return null;
        const niveau = Math.max(1, Math.min(5, Number(skill.niveau_requis ?? 3) || 3));
        const poids = Number(skill.poids ?? 0);
        return { intitule, niveau_requis: niveau, poids: Number.isFinite(poids) ? poids : 0 };
      })
      .filter((s): s is { intitule: string; niveau_requis: number; poids: number } => Boolean(s));

    const skills =
      normalizedSkills.length > 0
        ? normalizedSkills
        : [{ intitule: 'Competence generale', niveau_requis: 3, poids: 1 }];

    const totalWeight = skills.reduce((acc, s) => acc + Math.max(0, s.poids), 0);
    const withWeights =
      totalWeight > 0
        ? skills.map((s) => ({
            ...s,
            poids: Number((Math.max(0, s.poids) / totalWeight).toFixed(4)),
          }))
        : skills.map((s) => ({ ...s, poids: Number((1 / skills.length).toFixed(4)) }));

    const weightDelta = Number(
      (1 - withWeights.reduce((acc, s) => acc + s.poids, 0)).toFixed(4),
    );
    withWeights[withWeights.length - 1].poids = Number(
      (withWeights[withWeights.length - 1].poids + weightDelta).toFixed(4),
    );

    return JSON.stringify({
      titre: String(parsed.titre ?? 'Activite RH').trim() || 'Activite RH',
      description: String(parsed.description ?? '').trim(),
      required_skills: withWeights,
      top_n: topN,
      contexte,
    });
  }

  private buildLocalRewrite(dto: RewritePromptDto): string {
    const outputFormat = dto.outputFormat ?? 'text';
    const lang = (dto.targetLanguage ?? 'fr').toLowerCase();
    const prompt = dto.prompt.trim().replace(/\s+/g, ' ');
    const constraints = dto.constraints?.trim();

    // Basic local NLP-like cleanup and imperative phrasing.
    const normalized = prompt
      .replace(/\bje veux\b/gi, 'Generer')
      .replace(/\bje souhaite\b/gi, 'Generer')
      .replace(/\bmerci de\b/gi, '')
      .replace(/\bsvp\b/gi, '')
      .trim();

    const baseInstruction =
      lang.startsWith('en')
        ? `Generate a strict recommendation request from: "${normalized}". Return a concise imperative instruction.`
        : `Genere une demande de recommandation stricte a partir de: "${normalized}". Retourne une instruction imperative concise.`;

    const withConstraints = constraints
      ? `${baseInstruction} Contraintes: ${constraints}.`
      : baseInstruction;

    if (outputFormat === 'json') {
      return JSON.stringify(
        {
          instruction: withConstraints,
          language: lang,
          style: 'imperative',
        },
        null,
        0,
      );
    }

    return withConstraints;
  }

  async rewritePrompt(dto: RewritePromptDto) {
    // Default to non-strict mode so rewrite still works via local fallback
    // when OpenRouter is not configured or temporarily unavailable.
    const strictOpenRouter =
      (this.configService.get<string>('OPENROUTER_STRICT') ?? 'false').toLowerCase() ===
      'true';
    const apiKey =
      this.configService.get<string>('OPENROUTER_API_KEY') ??
      this.configService.get<string>('OPEN_ROUTER_API_KEY');
    if (!apiKey) {
      if (strictOpenRouter) {
        throw new ServiceUnavailableException(
          'OpenRouter non configure. Ajoutez OPENROUTER_API_KEY dans backend/.env',
        );
      }
      return {
        rewritten: this.buildLocalRewrite(dto),
        model: 'local-fallback',
        outputFormat: dto.outputFormat ?? 'text',
      };
    }

    const model =
      this.configService.get<string>('OPENROUTER_MODEL') ??
      'deepseek/deepseek-chat';

    const baseUrl =
      this.configService.get<string>('OPENROUTER_BASE_URL') ??
      'https://openrouter.ai/api/v1';

    const appTitle =
      this.configService.get<string>('OPENROUTER_APP_TITLE') ?? 'SkillUpTn';

    const referer =
      this.configService.get<string>('OPENROUTER_HTTP_REFERER') ??
      this.configService.get<string>('APP_URL') ??
      'http://localhost';

    const outputFormat = dto.outputFormat ?? 'text';
    const targetLanguage = dto.targetLanguage ?? 'fr';

    const systemParts = [
      `Tu es un service de reformulation RH pour pipeline NLP.`,
      `Ta mission: transformer le texte utilisateur en format strict machine-readable.`,
      outputFormat === 'json'
        ? [
            `Reponds UNIQUEMENT par un JSON VALIDE (sans markdown/backticks) avec EXACTEMENT ces cles:`,
            `{`,
            `  "titre": "string",`,
            `  "description": "string",`,
            `  "required_skills": [`,
            `    { "intitule": "string", "niveau_requis": 1-5, "poids": 0.0-1.0 }`,
            `  ],`,
            `  "top_n": 1-50,`,
            `  "contexte": "upskilling|expertise|development"`,
            `}`,
            `Regles:`,
            `- required_skills non vide`,
            `- somme des poids = 1.0`,
            `- aucun texte hors JSON`,
          ].join('\n')
        : `Reponds UNIQUEMENT par une phrase imperative concise exploitable par NLP (aucune explication).`,
      `Langue de sortie: ${targetLanguage}.`,
    ];

    if (dto.constraints?.trim()) {
      systemParts.push(`Contraintes a respecter: ${dto.constraints.trim()}`);
    }

    const controller = new AbortController();
    const timeoutMs = Number(
      this.configService.get<string>('OPENROUTER_TIMEOUT_MS') ?? 20_000,
    );
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const res = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          // Optional but recommended by OpenRouter to identify your app.
          'HTTP-Referer': referer,
          'X-Title': appTitle,
        },
        body: JSON.stringify({
          model,
          temperature: 0,
          messages: [
            { role: 'system', content: systemParts.join('\n') },
            { role: 'user', content: dto.prompt },
          ],
        }),
        signal: controller.signal,
      });

      const payload = (await res.json()) as OpenRouterChatCompletionResponse;

      if (!res.ok) {
        const msg = payload?.error?.message ?? `OpenRouter error (${res.status})`;
        if (strictOpenRouter) {
          throw new ServiceUnavailableException(`OpenRouter indisponible: ${msg}`);
        }
        return {
          rewritten: this.buildLocalRewrite(dto),
          model: `${model} (fallback: ${msg})`,
          outputFormat,
        };
      }

      const content = payload?.choices?.[0]?.message?.content?.trim();
      if (!content) {
        if (strictOpenRouter) {
          throw new ServiceUnavailableException(
            'OpenRouter a retourne une reponse vide pour la reformulation',
          );
        }
        return {
          rewritten: this.buildLocalRewrite(dto),
          model: `${model} (fallback: empty completion)`,
          outputFormat,
        };
      }

      return {
        rewritten:
          outputFormat === 'json' ? this.sanitizeOpenRouterJson(content) : content,
        model,
        outputFormat,
      };
    } catch (e: any) {
      const msg =
        typeof e?.message === 'string'
          ? e.message
          : 'Unexpected error while calling OpenRouter';
      if (strictOpenRouter) {
        throw new ServiceUnavailableException(`Echec OpenRouter: ${msg}`);
      }
      return {
        rewritten: this.buildLocalRewrite(dto),
        model: `${model} (fallback: ${msg})`,
        outputFormat,
      };
    } finally {
      clearTimeout(timeout);
    }
  }

  async generateActivityPrompt(dto: GenerateActivityPromptDto) {
    const seats = Math.max(1, Math.min(50, Number(dto.seats ?? 10) || 10));
    const skills = Array.isArray(dto.required_skills) ? dto.required_skills : [];
    const skillText =
      skills.length > 0
        ? skills
            .map(
              (s) =>
                `${s.skill_name} niveau ${this.mapDesiredLevelToNiveau(s.desired_level)}${
                  typeof s.weight === 'number' ? ` poids ${s.weight}` : ''
                }`,
            )
            .join(', ')
        : 'Aucune compétence explicite';

    const sourcePrompt = [
      `Activité: ${dto.title}`,
      `Description: ${dto.description}`,
      `Type: ${dto.type ?? 'training'}`,
      `Priorité: ${dto.priority ?? 'consolidate_medium'}`,
      `Nombre de places: ${seats}`,
      `Compétences requises: ${skillText}`,
      `Objectif: produire un prompt RH prêt à envoyer à /api/recommendations/generate`,
    ].join('\n');

    const rewritten = await this.rewritePrompt({
      prompt: sourcePrompt,
      targetLanguage: dto.targetLanguage ?? 'fr',
      outputFormat: 'json',
      constraints:
        "Retourne le schema ParsedActivity strict. required_skills non vide. top_n = nombre de places.",
    });

    let parsed: {
      titre?: string;
      description?: string;
      required_skills?: Array<{ intitule?: string; niveau_requis?: number }>;
      top_n?: number;
    } = {};
    try {
      parsed = JSON.parse(rewritten.rewritten);
    } catch {
      // Keep empty and fallback below.
    }

    const topN = Math.max(1, Math.min(50, Number(parsed.top_n ?? seats) || seats));
    const parsedSkills = Array.isArray(parsed.required_skills)
      ? parsed.required_skills
          .map((s) => ({
            intitule: String(s?.intitule ?? '').trim(),
            niveau: Math.max(1, Math.min(5, Number(s?.niveau_requis ?? 3) || 3)),
          }))
          .filter((s) => s.intitule.length > 0)
      : [];
    const fallbackSkills = skills.map((s) => ({
      intitule: s.skill_name,
      niveau: this.mapDesiredLevelToNiveau(s.desired_level),
    }));
    const finalSkills = parsedSkills.length > 0 ? parsedSkills : fallbackSkills;
    const normalizedSkills =
      finalSkills.length > 0
        ? finalSkills
        : [{ intitule: 'Communication professionnelle', niveau: 3 }];
    const skillLines = normalizedSkills
      .map((s) => `- ${String(s.intitule).trim()} niveau ${Math.max(1, Math.min(5, Number(s.niveau) || 3))}`)
      .join('\n')

    const title = String(parsed.titre ?? dto.title ?? 'Activite RH').trim();
    const description = String(parsed.description ?? dto.description ?? '').trim();
    const context = this.mapPriorityToBusinessContext(dto.priority);
    const activityType = String(dto.type ?? 'training').toLowerCase();
    const duration = String(dto.duration ?? 'N/A');
    const location = String(dto.location ?? 'N/A');
    // Keep a professional and deterministic prompt shape so the NLP parser
    // consistently extracts top_n + required skills ("<skill> niveau <1-5>").
    const finalPrompt = [
      `Demande RH professionnelle`,
      `Mission: proposer une shortlist de profils alignés aux besoins de l'activité.`,
      `Titre activité: ${title}`,
      `Description activité: ${description || 'Aucune description fournie'}`,
      `Contexte métier: ${context}`,
      `Type activité: ${activityType}`,
      `Nombre de profils attendus (Top_n): ${topN}`,
      `Contraintes opérationnelles: duree=${duration}; localisation=${location}`,
      `Compétences requises (format strict "<compétence> niveau <1-5>"):`,
      skillLines,
      `Instruction d'évaluation: classer les employés par adéquation sémantique, compétences validées, progression et historique.`,
      `Sortie attendue: classement final priorisé avec justification concise par profil.`,
    ].join('\n');

    return {
      prompt: finalPrompt,
      model: rewritten.model,
      outputFormat: 'text',
    };
  }
}

