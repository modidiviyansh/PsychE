// =============================================================================
//  Model Choice Router
//
//  Picks which LLM handles a given generation, trading reasoning depth against
//  free-tier rate limits. `chooseModelForReport` is pure and synchronous —
//  load stats are read once via getLoadStats() and passed in, so the ranking
//  logic itself has no I/O and is trivial to reason about (or test).
//
//  ⚠ maxRpm/maxRpd/maxTokensPerMin below are CONSERVATIVE PLACEHOLDER
//    DEFAULTS, not fetched from your actual Groq/Google account tier — there is
//    no API to ask "what's my current quota" from inside an Edge Function.
//    Set them to match your real plan. Under-provisioning them just means the
//    router falls back to a smaller model sooner than it strictly needs to
//    (a latency/quality cost); it does not cause incorrect behaviour, because
//    the actual HTTP call is still the real backstop if a limit is hit anyway.
//
//  Rate tracking is a database table (PsychE_Model_Usage_Log), not an
//  in-memory counter — Edge Functions are stateless per invocation (Deno
//  Deploy can cold-start or recycle workers between calls), so anything held
//  in a module-level variable would reset unpredictably and undercount.
// =============================================================================

export interface ModelProfile {
  name: string;
  provider: 'groq' | 'gemini';
  maxRpm: number;
  maxRpd: number;
  maxTokensPerMin: number;
  latencyClass: 'fast' | 'medium' | 'slow';
  reasoningClass: 'high' | 'medium' | 'low';
}

export const MODEL_PROFILES: ModelProfile[] = [
  {
    name: 'llama-3.3-70b-versatile', provider: 'groq',
    maxRpm: 30, maxRpd: 1000, maxTokensPerMin: 12000,
    latencyClass: 'slow', reasoningClass: 'high',
  },
  {
    name: 'llama-3.1-8b-instant', provider: 'groq',
    maxRpm: 30, maxRpd: 14400, maxTokensPerMin: 20000,
    latencyClass: 'fast', reasoningClass: 'medium',
  },
  {
    name: 'gemini-2.5-flash-lite', provider: 'gemini',
    maxRpm: 15, maxRpd: 1000, maxTokensPerMin: 32000,
    latencyClass: 'fast', reasoningClass: 'medium',
  },
];

export interface UsageCounts {
  callsLastMinute: number;
  callsToday: number;
}

export type LoadStats = Record<string, UsageCounts>;

async function getUsageCounts(supabase: any, modelName: string): Promise<UsageCounts> {
  const oneMinuteAgo = new Date(Date.now() - 60_000).toISOString();
  const startOfDay = new Date();
  startOfDay.setUTCHours(0, 0, 0, 0);

  const [{ count: minuteCount }, { count: dayCount }] = await Promise.all([
    supabase.from('PsychE_Model_Usage_Log').select('*', { count: 'exact', head: true })
      .eq('model_name', modelName).gte('called_at', oneMinuteAgo),
    supabase.from('PsychE_Model_Usage_Log').select('*', { count: 'exact', head: true })
      .eq('model_name', modelName).gte('called_at', startOfDay.toISOString()),
  ]);

  return { callsLastMinute: minuteCount ?? 0, callsToday: dayCount ?? 0 };
}

/** One read of PsychE_Model_Usage_Log per known model. Call once per request. */
export async function getLoadStats(supabase: any): Promise<LoadStats> {
  const stats: LoadStats = {};
  await Promise.all(
    MODEL_PROFILES.map(async (profile) => {
      stats[profile.name] = await getUsageCounts(supabase, profile.name);
    })
  );
  return stats;
}

function reasoningRank(m: ModelProfile): number {
  return m.reasoningClass === 'high' ? 2 : m.reasoningClass === 'medium' ? 1 : 0;
}

function isUnderCap(profile: ModelProfile, usage: UsageCounts | undefined): boolean {
  if (!usage) return true;
  return usage.callsLastMinute < profile.maxRpm && usage.callsToday < profile.maxRpd;
}

/**
 * Full ranked candidate list — under-cap models first (highest reasoning
 * first for 'full', lowest for 'summary'), over-cap models pushed to the end
 * rather than dropped entirely. A caller that iterates this list and falls
 * through on a real HTTP failure gets genuine fallback, not just a single
 * static pick.
 */
export function rankModelsForReport(
  loadStats: LoadStats,
  reportType: 'summary' | 'full',
  availableProviders: Set<'groq' | 'gemini'>
): ModelProfile[] {
  const candidates = MODEL_PROFILES.filter((m) => availableProviders.has(m.provider));
  const byReasoning = reportType === 'full'
    ? [...candidates].sort((a, b) => reasoningRank(b) - reasoningRank(a))
    : [...candidates].sort((a, b) => reasoningRank(a) - reasoningRank(b));

  const underCap = byReasoning.filter((m) => isUnderCap(m, loadStats[m.name]));
  const overCap = byReasoning.filter((m) => !isUnderCap(m, loadStats[m.name]));
  return [...underCap, ...overCap];
}

/**
 * `chooseModelForReport(loadStats, reportType)` — the top pick from the ranked
 * list. `availableProviders` is an addition beyond the original signature: a
 * deployment might only have GROQ_API_KEY set, and the router must never pick
 * a model whose provider has no key configured.
 */
export function chooseModelForReport(
  loadStats: LoadStats,
  reportType: 'summary' | 'full',
  availableProviders: Set<'groq' | 'gemini'>
): ModelProfile | null {
  const ranked = rankModelsForReport(loadStats, reportType, availableProviders);
  return ranked[0] ?? null;
}

/**
 * One row per generation. Doubles as the compliance audit trail — a Data
 * Protection Incharge can confirm what model ran, for which report type, and
 * roughly how much was sent, without reading raw prompts.
 */
export async function logModelUsage(
  supabase: any,
  entry: {
    modelName: string;
    provider: string;
    reportType: 'summary' | 'full' | 'session';
    tokensUsed: number | null;
    studentUuid: string | null;
  }
): Promise<void> {
  await supabase.from('PsychE_Model_Usage_Log').insert([{
    model_name: entry.modelName,
    provider: entry.provider,
    report_type: entry.reportType,
    tokens_used: entry.tokensUsed,
    student_uuid: entry.studentUuid,
  }]);
}
