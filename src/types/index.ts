// =============================================================================
//  PsychE V3.0 — TypeScript Interfaces
//  Single source of truth for all entity shapes.
//  Mirrors PsychE_ Supabase tables 1:1.
//  Generated from: docs/ARCH_technical-specs.md + Master Schema/psyche_v3_master_schema.sql
// =============================================================================

// ---------------------------------------------------------------------------
//  TIER 1: Base Types (No FK Dependencies)
// ---------------------------------------------------------------------------

export interface Student {
  id: string;                       // UUID PK
  student_id: string;               // UNIQUE human-readable ID (roll number etc.)
  full_name: string;
  fathers_name?: string | null;
  mothers_name?: string | null;
  mobile?: string | null;
  email?: string | null;
  course?: string | null;
  enrolled_date?: string | null;    // ISO date string
  risk_level: RiskLevel;            // 'Low' | 'Medium' | 'High'
  engagement_modifier: number;      // V2 scheduling weight, default 0
  profile_image?: string | null;    // URL string
  created_at: string;               // ISO timestamptz
}

export type RiskLevel = 'Low' | 'Medium' | 'High';

export interface Settings {
  id: 1;                            // Singleton — always 1
  daily_session_capacity: number;   // Default: 7
  allowed_pins: string;             // Comma-separated PIN string e.g. "2001,0987"
  app_version: string;              // e.g. "4.0.0"
  assessment_cooldown_days: number; // Default: 30
}

export type ModuleType = 'COMPE' | 'PsycheSPA' | 'Custom';

export interface Domain {
  code: string;                       // VARCHAR(10) PK
  name: string;                       // VARCHAR(100) NOT NULL
  description?: string | null;        // TEXT
}

export interface Module {
  id: string;                       // UUID PK
  name: string;
  type: ModuleType;                 // CHECK: COMPE | PsycheSPA | Custom
  domain_code?: string | null;      // FK → PsychE_Domains(code)
  description?: string | null;
  smart_keywords: string[];         // TEXT[] — GIN-indexed
  is_locked: boolean;               // One-time-edit lock flag
  created_at: string;
}

export interface SystemTag {
  id: string;                       // UUID PK
  tag_name: string;                 // UNIQUE
  tag_category: TagCategory;
  color_hex: string;                // Hex string e.g. "#4ade80"
  created_at: string;
}

export type TagCategory = 'Behavioral' | 'Academic' | 'Career' | 'Custom' | 'General';

// ---------------------------------------------------------------------------
//  TIER 2: Single FK Dependency
// ---------------------------------------------------------------------------

export interface Question {
  id: string;                       // UUID PK
  module_id: string;                // FK → PsychE_Modules(id)
  prompt_text: string;
  is_reverse_scored: boolean;
  custom_labels: QuestionLabels;    // JSONB: keys "1"–"4"
  is_active: boolean;               // Soft-delete toggle
  has_been_edited: boolean;         // One-time-edit flag for locked modules
  created_at: string;
}

export type QuestionLabels = {
  '1': string;
  '2': string;
  '3': string;
  '4': string;
};

export const DEFAULT_LABELS: QuestionLabels = {
  '1': 'Not True',
  '2': 'A little true',
  '3': 'Pretty true',
  '4': 'Very true',
};

export type SessionStatus = 'Scheduled' | 'Completed' | 'Overdue' | 'Cancelled';
export type InteractionType = 'Session' | 'Phone' | 'Email' | 'Walk-in';
export type FollowUpStatus = 'Pending' | 'Done' | 'Cancelled';

export interface CounselingLog {
  id: string;                       // UUID PK
  student_uuid: string;             // FK → PsychE_Students(id)
  counselor_name: string;
  session_date: string;             // ISO timestamptz — actual session timestamp
  scheduled_date?: string | null;   // ISO date string — V2 Kanban date
  session_status: SessionStatus;
  interaction_type: InteractionType;
  reason: string;
  student_response?: string | null;
  recommended_action?: string | null;
  file_updated: boolean;
  notification_sent: boolean;
  follow_up_date?: string | null;
  follow_up_status: FollowUpStatus;
  assessment_data?: Record<string, unknown> | null; // Raw PsycheSPA result JSONB
  created_at: string;
}

// ---------------------------------------------------------------------------
//  TIER 3: Multiple FK Dependencies
// ---------------------------------------------------------------------------

export interface StudentTag {
  student_uuid: string;             // FK → PsychE_Students(id)
  tag_id: string;                   // FK → PsychE_System_Tags(id)
  assigned_at: string;
}

// Junction with resolved tag data (from join)
export interface StudentTagWithDetails extends StudentTag {
  PsychE_System_Tags: SystemTag;
}

export interface Response {
  id: string;                       // UUID PK
  log_id: string;                   // FK → PsychE_Counseling_Logs(id)
  question_id: string;              // FK → PsychE_Questions(id)
  score_value: 1 | 2 | 3 | 4;      // CHECK (1–4)
  created_at: string;
}

// ---------------------------------------------------------------------------
//  Derived / UI Types
// ---------------------------------------------------------------------------

/** Student with resolved tag list (used in StudentProfile) */
export interface StudentWithTags extends Student {
  tags: SystemTag[];
}

/** CounselingLog with resolved student data (used in Kanban, AllLogs) */
export interface LogWithStudent extends CounselingLog {
  PsychE_Students: Pick<Student, 'id' | 'full_name' | 'student_id' | 'risk_level'>;
}

/** Response with reverse-scoring metadata merged in (used in AssessmentWizard) */
export interface ScoredResponse extends Response {
  is_reverse_scored: boolean;
  effective_score: number;          // Computed at read time
}

/** Date capacity status (used by capacity.ts + date picker) */
export interface DateCapacityStatus {
  isFull: boolean;
  load: number;
  capacity: number;
}

/** Module with question count (used in LibraryManager master pane) */
export interface ModuleWithCount extends Module {
  question_count: number;
}

/** Assessment score summary stored in CounselingLog.assessment_data */
export interface AssessmentSummary {
  module_id: string;
  module_name: string;
  score_percentage: number;         // 0–100
  response_count: number;
  computed_at: string;              // ISO timestamptz
}

export interface DomainScores {
  BHV: number | null;
  SOC: number | null;
  COG: number | null;
  EMH: number | null;
  FAM: number | null;
  CAR: number | null;
  SEL: number | null;
}

export interface TelemetryTensions {
  T_cognitive_emotional: number | null;
  T_social_home: number | null;
  T_internal_external: number | null;
}

export interface TelemetryPayload {
  student_uuid?: string;
  session_count: number;
  data_completeness: number;
  archetype: string;
  domain_scores: DomainScores;
  tensions: TelemetryTensions;
  calculated_at?: string;
  engine_status?: string;
  confidence_multiplier?: number;
  eti_score?: number;
  eti_data?: {
    eti: number | null;
    attendance_ratio: number;
    follow_through_ratio: number;
    recency_factor: number;
    avoidance_flag: boolean;
    avoidance_ratio: number;
  };
}

export interface StudentTelemetry {
  id: string;
  student_uuid: string;
  calculated_at: string;
  metrics_payload: TelemetryPayload;
}
