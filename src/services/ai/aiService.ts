import { UserProfile, ChatMessage, AIAssistantContext } from '../../types';
import {
  getAuthorizedUserContextSummary,
  processAcademicQuery,
  AcademicQueryResult,
} from './academicDataEngine';

export interface AIProviderStatus {
  isConfigured: boolean;
  providerName: string;
  modelName: string;
  mode: 'external_llm' | 'local_academic_engine';
  notice?: string;
}

/**
 * Inspect configured AI provider environment variables.
 * Keys must be supplied via server/Vite environment variables, never hardcoded.
 */
export function getAIProviderStatus(): AIProviderStatus {
  const geminiKey = import.meta.env.VITE_GEMINI_API_KEY;
  const customAiKey = import.meta.env.VITE_AI_API_KEY;
  const openaiKey = import.meta.env.VITE_OPENAI_API_KEY;
  const customEndpoint = import.meta.env.VITE_AI_ENDPOINT;

  if (geminiKey) {
    return {
      isConfigured: true,
      providerName: 'Google Gemini',
      modelName: 'gemini-1.5-flash',
      mode: 'external_llm',
    };
  }

  if (openaiKey) {
    return {
      isConfigured: true,
      providerName: 'OpenAI',
      modelName: 'gpt-4o-mini',
      mode: 'external_llm',
    };
  }

  if (customEndpoint || customAiKey) {
    return {
      isConfigured: true,
      providerName: 'Enterprise AI Gateway',
      modelName: 'institutional-llm',
      mode: 'external_llm',
    };
  }

  return {
    isConfigured: false,
    providerName: 'CourseTracker Academic Engine',
    modelName: 'Deterministic Academic Engine v1.0',
    mode: 'local_academic_engine',
    notice: 'External LLM unconfigured. Grounded in CourseTracker local institutional database. (Set VITE_GEMINI_API_KEY to activate generative LLM).',
  };
}

/**
 * Session storage manager for conversation continuity within active session.
 * Isolated strictly by User ID to prevent cross-account history leakage.
 */
export function getStoredChatHistory(userId: string): ChatMessage[] {
  if (typeof sessionStorage === 'undefined' || !userId) return [];
  try {
    const raw = sessionStorage.getItem(`msot_ai_chat_${userId}`);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveStoredChatHistory(userId: string, messages: ChatMessage[]): void {
  if (typeof sessionStorage === 'undefined' || !userId) return;
  try {
    // Retain maximum of 30 recent messages to keep memory compact
    const slice = messages.slice(-30);
    sessionStorage.setItem(`msot_ai_chat_${userId}`, JSON.stringify(slice));
  } catch (err) {
    console.warn('[CourseTracker AI] Failed to save session chat history:', err);
  }
}

export function clearStoredChatHistory(userId: string): void {
  if (typeof sessionStorage === 'undefined' || !userId) return;
  try {
    sessionStorage.removeItem(`msot_ai_chat_${userId}`);
  } catch {}
}

/**
 * Dispatch query to AI provider or CourseTracker Local Academic Engine.
 */
export async function sendChatMessage(
  userQuery: string,
  user: UserProfile,
  previousHistory: ChatMessage[] = []
): Promise<ChatMessage> {
  const providerStatus = getAIProviderStatus();
  const nowIso = new Date().toISOString();
  const campus = user.branch_id || user.campus_id || 'Ghaziabad';

  // 1. Always evaluate through Academic Engine first for safety and instant resolution
  const deterministicResult = processAcademicQuery(userQuery, user);

  // If a security violation or campus boundary check fired, immediately return it
  if (
    deterministicResult.intent === 'security_violation' ||
    deterministicResult.intent === 'campus_boundary_blocked'
  ) {
    return {
      id: 'ai-msg-' + Date.now(),
      role: 'assistant',
      content: deterministicResult.content,
      timestamp: nowIso,
      metadata: {
        intent: deterministicResult.intent,
        generatedBy: 'academic_engine',
        citations: deterministicResult.citations,
        suggestedActions: deterministicResult.suggestedActions,
      },
    };
  }

  // 2. If an external LLM is configured (e.g. Gemini), call it with bounded system context
  if (providerStatus.isConfigured && providerStatus.mode === 'external_llm') {
    const geminiKey = import.meta.env.VITE_GEMINI_API_KEY;
    const openaiKey = import.meta.env.VITE_OPENAI_API_KEY;

    try {
      const authorizedSummary = getAuthorizedUserContextSummary(user);
      const systemInstruction = `
You are CourseTracker AI, an intelligent, professional academic assistant integrated into CourseTracker.
User Identity: ${user.name} (Role: ${user.role}, Campus: ${campus}).

STRICT OPERATIONAL RULES:
1. Strict Campus Isolation: The user belongs ONLY to ${campus}. NEVER discuss or reveal data from other campuses.
2. Factual Accuracy: Use ONLY the provided authorized context. NEVER fabricate grades, deadlines, syllabus hours, or exam dates.
3. Read-Only Actions: You cannot edit timetables or approve extra classes. Propose recovery plans as suggestions only.
4. Response Format: Concise, clear markdown with bold headers and bullet points.

CURRENT AUTHORIZED ACADEMIC CONTEXT:
${authorizedSummary}

RELEVANT DATA EXTRACTED BY ACADEMIC ENGINE:
${deterministicResult.content}
`.trim();

      if (geminiKey) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 12000);

        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`;
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: controller.signal,
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: systemInstruction }] },
            contents: [
              ...previousHistory.slice(-4).map((m) => ({
                role: m.role === 'user' ? 'user' : 'model',
                parts: [{ text: m.content }],
              })),
              { role: 'user', parts: [{ text: userQuery }] },
            ],
            generationConfig: {
              temperature: 0.2,
              maxOutputTokens: 800,
            },
          }),
        });

        clearTimeout(timeoutId);

        if (response.ok) {
          const json = await response.json();
          const generatedText = json.candidates?.[0]?.content?.parts?.[0]?.text;
          if (generatedText) {
            return {
              id: 'ai-msg-' + Date.now(),
              role: 'assistant',
              content: generatedText,
              timestamp: nowIso,
              metadata: {
                intent: deterministicResult.intent,
                generatedBy: 'ai_provider',
                isRecommendation: deterministicResult.isRecommendation,
                citations: ['Google Gemini 1.5 Flash', ...deterministicResult.citations],
                suggestedActions: deterministicResult.suggestedActions,
              },
            };
          }
        }
      }
    } catch (err: any) {
      console.warn('[CourseTracker AI] External AI Provider error, falling back to local engine:', err?.message || err);
      // Graceful fallback continues below
    }
  }

  // 3. Return validated CourseTracker Academic Engine result
  return {
    id: 'ai-msg-' + Date.now(),
    role: 'assistant',
    content: deterministicResult.content,
    timestamp: nowIso,
    metadata: {
      intent: deterministicResult.intent,
      generatedBy: 'academic_engine',
      isRecommendation: deterministicResult.isRecommendation,
      citations: deterministicResult.citations,
      suggestedActions: deterministicResult.suggestedActions,
    },
  };
}
