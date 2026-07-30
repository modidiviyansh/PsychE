// =============================================================================
//  Shared LLM call plumbing — used by generate-ai-report and generate-session-report.
//  Neither function talks to Groq/Gemini directly; both go through here so a
//  provider quirk (auth header shape, token-limit field name) is fixed once.
// =============================================================================

export interface CallOptions {
  maxTokens: number;
  temperature?: number;
  /** Forces a valid-JSON response. Leave off for plain prose (e.g. a formal narrative). */
  jsonMode?: boolean;
}

export interface LLMResult {
  content: string;
  /** From the provider's own usage block — null if it didn't report one. Feeds PsychE_Model_Usage_Log, not billing. */
  tokensUsed: number | null;
}

export type CallFn = (system: string, user: string) => Promise<LLMResult>;

export async function callGroq(
  apiKey: string,
  model: string,
  systemPrompt: string,
  userPrompt: string,
  opts: CallOptions
): Promise<LLMResult> {
  const body: Record<string, unknown> = {
    model,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    temperature: opts.temperature ?? 0.4,
    max_tokens: opts.maxTokens,
  };
  if (opts.jsonMode) body.response_format = { type: 'json_object' };

  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Groq ${res.status}: ${await res.text()}`);
  const json = await res.json();
  return {
    content: json.choices?.[0]?.message?.content ?? '',
    tokensUsed: json.usage?.total_tokens ?? null,
  };
}

export async function callGemini(
  apiKey: string,
  model: string,
  systemPrompt: string,
  userPrompt: string,
  opts: CallOptions
): Promise<LLMResult> {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: `${systemPrompt}\n\n${userPrompt}` }] }],
        generationConfig: {
          temperature: opts.temperature ?? 0.4,
          maxOutputTokens: opts.maxTokens,
          ...(opts.jsonMode ? { responseMimeType: 'application/json' } : {}),
        },
      }),
    }
  );
  if (!res.ok) throw new Error(`Gemini ${res.status}: ${await res.text()}`);
  const json = await res.json();
  return {
    content: json.candidates?.[0]?.content?.parts?.[0]?.text ?? '',
    tokensUsed: json.usageMetadata?.totalTokenCount ?? null,
  };
}

export function stripCodeFences(text: string): string {
  const trimmed = text.trim();
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  return fenced ? fenced[1] : trimmed;
}

export interface JsonGenerationResult {
  data: Record<string, any>;
  tokensUsed: number | null;
}

/**
 * JSON-shaped generation with one repair pass (PRD §9.3): if the model's own
 * output didn't parse or didn't match the expected shape, ask the SAME
 * provider to fix its own JSON rather than silently failing.
 */
export async function generateJsonWithRepair(
  call: CallFn,
  systemPrompt: string,
  userPrompt: string,
  isValidShape: (obj: any) => boolean
): Promise<JsonGenerationResult> {
  const first = await call(systemPrompt, userPrompt);
  try {
    const parsed = JSON.parse(stripCodeFences(first.content));
    if (isValidShape(parsed)) return { data: parsed, tokensUsed: first.tokensUsed };
    throw new Error('shape mismatch');
  } catch {
    const repaired = await call(
      'You output invalid or incorrectly-shaped JSON. Return ONLY the corrected valid JSON object matching the schema you were given — no commentary, no markdown fences.',
      first.content
    );
    const parsed = JSON.parse(stripCodeFences(repaired.content));
    if (!isValidShape(parsed)) throw new Error('Model repair pass still produced an invalid shape.');
    return { data: parsed, tokensUsed: (first.tokensUsed ?? 0) + (repaired.tokensUsed ?? 0) };
  }
}

export interface TextGenerationResult {
  text: string;
  tokensUsed: number | null;
}

/** Plain-prose generation — no JSON schema to validate, just "did it say something". */
export async function generatePlainText(call: CallFn, systemPrompt: string, userPrompt: string): Promise<TextGenerationResult> {
  const result = await call(systemPrompt, userPrompt);
  const text = result.content.trim();
  if (!text) throw new Error('Model returned empty output.');
  return { text, tokensUsed: result.tokensUsed };
}
