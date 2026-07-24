import { supabase } from './supabase';

export interface AssessmentQuestion {
  id: string;
  module_id: string;
  prompt_text: string;
  is_reverse_scored: boolean;
  custom_labels: Record<string, string>;
  module_name: string;
}

export async function fetchAssessmentQuestions(
  studentUuid: string,
  moduleId?: string,
  limit: number = 8
): Promise<AssessmentQuestion[]> {
  try {
    // 1. Fetch Cooldown Settings
    const { data: settings } = await supabase
      .from('PsychE_Settings')
      .select('assessment_cooldown_days')
      .single();
    
    const cooldownDays = settings?.assessment_cooldown_days || 30;

    // 2. Fetch Recently Answered Question IDs within cooldown
    // Calculate the date cutoff
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - cooldownDays);
    const cutoffDateString = cutoffDate.toISOString();

    // Query PsychE_Responses linked to logs for this student within cutoff date
    const { data: recentLogs } = await supabase
      .from('PsychE_Counseling_Logs')
      .select('id')
      .eq('student_uuid', studentUuid)
      .gte('session_date', cutoffDateString);

    let answeredQuestionIds: string[] = [];

    if (recentLogs && recentLogs.length > 0) {
      const logIds = recentLogs.map((l: any) => l.id);
      
      const { data: recentResponses } = await supabase
        .from('PsychE_Responses')
        .select('question_id')
        .in('log_id', logIds);

      if (recentResponses) {
        answeredQuestionIds = recentResponses.map((r: any) => r.question_id);
      }
    }

    // 3. Fetch Available Questions (Joined with Modules for type and name)
    let questionsQuery = supabase
      .from('PsychE_Questions')
      .select(`
        id,
        module_id,
        prompt_text,
        is_reverse_scored,
        custom_labels,
        is_active,
        PsychE_Modules!inner (
          id,
          name,
          type,
          is_locked
        )
      `)
      .eq('is_active', true);

    if (moduleId) {
      questionsQuery = questionsQuery.eq('module_id', moduleId);
    }

    const { data: availableQuestions, error } = await questionsQuery;

    if (error || !availableQuestions) {
      console.error("Error fetching questions:", error);
      return [];
    }

    let filteredQuestions = availableQuestions;

    if (!moduleId) {
      // Daily Mix: COMPE only, unlocked only.
      filteredQuestions = availableQuestions.filter((q: any) => 
        q.PsychE_Modules?.type === 'COMPE' && q.PsychE_Modules?.is_locked === false
      );
    }

    // Apply cooldown filter universally
    filteredQuestions = filteredQuestions.filter(
      (q: any) => !answeredQuestionIds.includes(q.id)
    );

    // 5. Randomize and limit
    const shuffled = [...filteredQuestions].sort(() => 0.5 - Math.random());
    const selected = shuffled.slice(0, limit);

    // 6. Map to clean interface
    return selected.map((q: any) => ({
      id: q.id,
      module_id: q.module_id,
      prompt_text: q.prompt_text,
      is_reverse_scored: q.is_reverse_scored,
      custom_labels: q.custom_labels,
      module_name: q.PsychE_Modules.name
    }));

  } catch (error) {
    console.error("Smart Fetch Engine Error:", error);
    return [];
  }
}
