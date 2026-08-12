/**
 * Hand-written to match supabase/migrations/*.sql exactly.
 *
 * Once the project is linked to a real Supabase instance, prefer
 * regenerating this from the live schema so it can never drift:
 *   supabase gen types typescript --project-id <project-ref> > types/supabase.ts
 */
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type UserRole = "teacher" | "admin";
export type SubscriptionStatus =
  | "inactive"
  | "trialing"
  | "active"
  | "past_due"
  | "canceled";
export type SubscriptionTier = "full_year" | "one_course" | "two_course";
export type StripeSubscriptionStatus =
  | "incomplete"
  | "incomplete_expired"
  | "trialing"
  | "active"
  | "past_due"
  | "canceled"
  | "unpaid"
  | "paused";
export type CalendarDayType =
  | "regular"
  | "holiday"
  | "testing"
  | "early_release"
  | "block_day";
export type RateLimitAction = "signup" | "login" | "password_reset";
export type PacingAccuracy = "too_fast" | "just_right" | "too_slow";
export type EngagementLevel = "low" | "medium" | "high";
export type PrepCategory =
  | "materials_to_print"
  | "materials_to_cut"
  | "tech_to_test"
  | "supplies_needed";
export type PrepPriority = "low" | "medium" | "high";
export type PortfolioArtifactType = "file" | "link" | "text";
export type TeksMasteryStatus =
  | "not_started"
  | "introduced"
  | "practiced"
  | "assessed"
  | "mastered"
  | "needs_reteaching";
export type LessonStatus = "draft" | "published";
export type AssignmentType =
  | "classwork"
  | "homework"
  | "project"
  | "guided_notes"
  | "worksheet"
  | "spreadsheet"
  | "card_sort"
  | "simulation"
  | "game"
  | "case_study"
  | "research"
  | "presentation"
  | "exit_ticket"
  | "quiz"
  | "test"
  | "lab_investigation"
  | "debate"
  | "socratic_seminar"
  | "reflection_journal"
  | "peer_review";
export type AssignmentStatus = "draft" | "published";
/** One rubric criterion, as stored in assignments.rubric (jsonb array). */
export type RubricCriterion = {
  criterion: string;
  points: number;
  description?: string | null;
};
export type QuestionType =
  | "multiple_choice"
  | "true_false"
  | "matching"
  | "calculation"
  | "short_response"
  | "scenario_analysis"
  | "essay"
  | "performance_task";
export type AssessmentStatus = "draft" | "published";
export type AssessmentVariant = "original" | "retake" | "modified";
/** One question, as stored in assessments.questions (jsonb array). Shape
 * varies by `type` — `options`/`correct_answer` for multiple_choice,
 * `pairs` for matching, etc. — validated loosely at the DB layer (see the
 * assessments migration) and precisely by generatedQuestionSchema. */
export type Question = {
  id: string;
  type: QuestionType;
  prompt: string;
  points: number;
  options: string[] | null;
  correct_answer: string | null;
  pairs: { left: string; right: string }[] | null;
};
export type LessonSegmentKey =
  | "bell_ringer"
  | "mini_lesson"
  | "modeling"
  | "activity"
  | "debrief"
  | "exit_ticket";

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          name: string | null;
          school: string | null;
          role: UserRole;
          subscription_status: SubscriptionStatus;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          name?: string | null;
          school?: string | null;
          role?: UserRole;
          subscription_status?: SubscriptionStatus;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["profiles"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "profiles_id_fkey";
            columns: ["id"];
            isOneToOne: true;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      courses: {
        Row: {
          id: string;
          slug: string;
          display_name: string;
          accent_color: string;
          week_count: number;
          sort_order: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          slug: string;
          display_name: string;
          accent_color: string;
          week_count?: number;
          sort_order: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["courses"]["Insert"]>;
        Relationships: [];
      };
      subscriptions: {
        Row: {
          id: string;
          profile_id: string;
          tier: SubscriptionTier;
          status: StripeSubscriptionStatus;
          stripe_customer_id: string | null;
          stripe_subscription_id: string | null;
          current_period_end: string | null;
          course_ids: string[];
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          profile_id: string;
          tier: SubscriptionTier;
          status?: StripeSubscriptionStatus;
          stripe_customer_id?: string | null;
          stripe_subscription_id?: string | null;
          current_period_end?: string | null;
          course_ids?: string[];
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["subscriptions"]["Insert"]
        >;
        Relationships: [
          {
            foreignKeyName: "subscriptions_profile_id_fkey";
            columns: ["profile_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      academic_calendars: {
        Row: {
          id: string;
          profile_id: string;
          school_year_label: string;
          start_date: string;
          end_date: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          profile_id: string;
          school_year_label: string;
          start_date: string;
          end_date: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["academic_calendars"]["Insert"]
        >;
        Relationships: [
          {
            foreignKeyName: "academic_calendars_profile_id_fkey";
            columns: ["profile_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      calendar_days: {
        Row: {
          id: string;
          academic_calendar_id: string;
          date: string;
          day_type: CalendarDayType;
          label: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          academic_calendar_id: string;
          date: string;
          day_type?: CalendarDayType;
          label?: string | null;
          created_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["calendar_days"]["Insert"]
        >;
        Relationships: [
          {
            foreignKeyName: "calendar_days_academic_calendar_id_fkey";
            columns: ["academic_calendar_id"];
            isOneToOne: false;
            referencedRelation: "academic_calendars";
            referencedColumns: ["id"];
          },
        ];
      };
      auth_rate_limit_attempts: {
        Row: {
          id: number;
          action: RateLimitAction;
          identifier: string;
          succeeded: boolean;
          created_at: string;
        };
        Insert: {
          id?: number;
          action: RateLimitAction;
          identifier: string;
          succeeded?: boolean;
          created_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["auth_rate_limit_attempts"]["Insert"]
        >;
        Relationships: [];
      };
      teks: {
        Row: {
          id: string;
          code: string;
          subject: string;
          description: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          code: string;
          subject: string;
          description: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["teks"]["Insert"]>;
        Relationships: [];
      };
      units: {
        Row: {
          id: string;
          course_id: string;
          unit_number: number;
          title: string;
          teks_focus_summary: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          course_id: string;
          unit_number: number;
          title: string;
          teks_focus_summary?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["units"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "units_course_id_fkey";
            columns: ["course_id"];
            isOneToOne: false;
            referencedRelation: "courses";
            referencedColumns: ["id"];
          },
        ];
      };
      weeks: {
        Row: {
          id: string;
          unit_id: string;
          course_id: string;
          week_number: number;
          title: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          unit_id: string;
          // Denormalized server-side by a trigger from unit_id — safe (and
          // simplest) to omit on insert; if supplied it's overwritten anyway.
          course_id?: string;
          week_number: number;
          title: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["weeks"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "weeks_unit_id_fkey";
            columns: ["unit_id"];
            isOneToOne: false;
            referencedRelation: "units";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "weeks_course_id_fkey";
            columns: ["course_id"];
            isOneToOne: false;
            referencedRelation: "courses";
            referencedColumns: ["id"];
          },
        ];
      };
      lessons: {
        Row: {
          id: string;
          week_id: string;
          course_id: string;
          day_number: number;
          title: string;
          i_do: string | null;
          we_do: string | null;
          you_do_together: string | null;
          you_do: string | null;
          qsssa_question: string | null;
          qsssa_signal: string | null;
          qsssa_stem: string | null;
          qsssa_share: string | null;
          qsssa_assess: string | null;
          homework: string[];
          teks_ids: string[];
          status: LessonStatus;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          week_id: string;
          // Denormalized server-side by a trigger from week_id.
          course_id?: string;
          day_number: number;
          title: string;
          i_do?: string | null;
          we_do?: string | null;
          you_do_together?: string | null;
          you_do?: string | null;
          qsssa_question?: string | null;
          qsssa_signal?: string | null;
          qsssa_stem?: string | null;
          qsssa_share?: string | null;
          qsssa_assess?: string | null;
          homework?: string[];
          teks_ids?: string[];
          status?: LessonStatus;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["lessons"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "lessons_week_id_fkey";
            columns: ["week_id"];
            isOneToOne: false;
            referencedRelation: "weeks";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "lessons_course_id_fkey";
            columns: ["course_id"];
            isOneToOne: false;
            referencedRelation: "courses";
            referencedColumns: ["id"];
          },
        ];
      };
      lesson_segments: {
        Row: {
          id: string;
          lesson_id: string;
          segment_key: LessonSegmentKey;
          title: string;
          description: string | null;
          duration_minutes: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          lesson_id: string;
          segment_key: LessonSegmentKey;
          title: string;
          description?: string | null;
          duration_minutes: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["lesson_segments"]["Insert"]
        >;
        Relationships: [
          {
            foreignKeyName: "lesson_segments_lesson_id_fkey";
            columns: ["lesson_id"];
            isOneToOne: false;
            referencedRelation: "lessons";
            referencedColumns: ["id"];
          },
        ];
      };
      assignments: {
        Row: {
          id: string;
          unit_id: string;
          course_id: string;
          assignment_type: AssignmentType;
          title: string;
          instructions: string | null;
          teacher_directions: string | null;
          rubric: RubricCriterion[];
          answer_key: string | null;
          status: AssignmentStatus;
          // References teks.id — validated by trigger, same pattern as
          // lessons.teks_ids. Added in the teks_mastery migration so the
          // semantic-matching suggestion feature has somewhere to write
          // approved codes for assignments, not just lessons.
          teks_ids: string[];
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          unit_id: string;
          // Denormalized server-side by a trigger from unit_id.
          course_id?: string;
          assignment_type: AssignmentType;
          title: string;
          instructions?: string | null;
          teacher_directions?: string | null;
          rubric?: RubricCriterion[];
          answer_key?: string | null;
          status?: AssignmentStatus;
          teks_ids?: string[];
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["assignments"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "assignments_unit_id_fkey";
            columns: ["unit_id"];
            isOneToOne: false;
            referencedRelation: "units";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "assignments_course_id_fkey";
            columns: ["course_id"];
            isOneToOne: false;
            referencedRelation: "courses";
            referencedColumns: ["id"];
          },
        ];
      };
      assessments: {
        Row: {
          id: string;
          unit_id: string;
          course_id: string;
          title: string;
          questions: Question[];
          answer_key: string | null;
          teks_ids: string[];
          status: AssessmentStatus;
          variant_type: AssessmentVariant;
          source_assessment_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          unit_id: string;
          // Denormalized server-side by a trigger from unit_id.
          course_id?: string;
          title: string;
          questions?: Question[];
          answer_key?: string | null;
          teks_ids?: string[];
          status?: AssessmentStatus;
          variant_type?: AssessmentVariant;
          source_assessment_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["assessments"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "assessments_unit_id_fkey";
            columns: ["unit_id"];
            isOneToOne: false;
            referencedRelation: "units";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "assessments_course_id_fkey";
            columns: ["course_id"];
            isOneToOne: false;
            referencedRelation: "courses";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "assessments_source_assessment_id_fkey";
            columns: ["source_assessment_id"];
            isOneToOne: false;
            referencedRelation: "assessments";
            referencedColumns: ["id"];
          },
        ];
      };
      classes: {
        Row: {
          id: string;
          profile_id: string;
          course_id: string;
          name: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          profile_id: string;
          course_id: string;
          name: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["classes"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "classes_profile_id_fkey";
            columns: ["profile_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "classes_course_id_fkey";
            columns: ["course_id"];
            isOneToOne: false;
            referencedRelation: "courses";
            referencedColumns: ["id"];
          },
        ];
      };
      students: {
        Row: {
          id: string;
          class_id: string;
          name: string;
          // Denormalized from classes.profile_id by a trigger — every
          // gradebook/RLS read here goes through teacher_id directly
          // rather than joining through classes.
          teacher_id: string;
          class_period: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          class_id: string;
          name: string;
          teacher_id?: string;
          class_period?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["students"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "students_class_id_fkey";
            columns: ["class_id"];
            isOneToOne: false;
            referencedRelation: "classes";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "students_teacher_id_fkey";
            columns: ["teacher_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      grades: {
        Row: {
          id: string;
          student_id: string;
          assessment_id: string | null;
          assignment_id: string | null;
          score: number;
          max_score: number;
          date: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          student_id: string;
          assessment_id?: string | null;
          assignment_id?: string | null;
          score: number;
          max_score: number;
          date?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["grades"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "grades_student_id_fkey";
            columns: ["student_id"];
            isOneToOne: false;
            referencedRelation: "students";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "grades_assessment_id_fkey";
            columns: ["assessment_id"];
            isOneToOne: false;
            referencedRelation: "assessments";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "grades_assignment_id_fkey";
            columns: ["assignment_id"];
            isOneToOne: false;
            referencedRelation: "assignments";
            referencedColumns: ["id"];
          },
        ];
      };
      teks_mastery: {
        Row: {
          id: string;
          student_id: string;
          teks_code: string;
          status: TeksMasteryStatus;
          last_updated: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          student_id: string;
          teks_code: string;
          status?: TeksMasteryStatus;
          last_updated?: string;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["teks_mastery"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "teks_mastery_student_id_fkey";
            columns: ["student_id"];
            isOneToOne: false;
            referencedRelation: "students";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "teks_mastery_teks_code_fkey";
            columns: ["teks_code"];
            isOneToOne: false;
            referencedRelation: "teks";
            referencedColumns: ["code"];
          },
        ];
      };
      reflections: {
        Row: {
          id: string;
          lesson_id: string;
          profile_id: string;
          what_worked: string | null;
          what_confused_students: string | null;
          pacing_accuracy: PacingAccuracy | null;
          engagement_level: EngagementLevel | null;
          reteach_flag: boolean;
          action_items: string | null;
          is_favorite: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          lesson_id: string;
          profile_id: string;
          what_worked?: string | null;
          what_confused_students?: string | null;
          pacing_accuracy?: PacingAccuracy | null;
          engagement_level?: EngagementLevel | null;
          reteach_flag?: boolean;
          action_items?: string | null;
          is_favorite?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["reflections"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "reflections_lesson_id_fkey";
            columns: ["lesson_id"];
            isOneToOne: false;
            referencedRelation: "lessons";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "reflections_profile_id_fkey";
            columns: ["profile_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      prep_items: {
        Row: {
          id: string;
          lesson_id: string;
          profile_id: string;
          description: string;
          category: PrepCategory;
          due_date: string | null;
          priority: PrepPriority;
          completed: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          lesson_id: string;
          profile_id: string;
          description: string;
          category: PrepCategory;
          due_date?: string | null;
          priority?: PrepPriority;
          completed?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["prep_items"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "prep_items_lesson_id_fkey";
            columns: ["lesson_id"];
            isOneToOne: false;
            referencedRelation: "lessons";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "prep_items_profile_id_fkey";
            columns: ["profile_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      portfolio_items: {
        Row: {
          id: string;
          student_id: string;
          assignment_id: string | null;
          title: string;
          description: string | null;
          artifact_type: PortfolioArtifactType;
          file_path: string | null;
          link_url: string | null;
          text_content: string | null;
          submitted_date: string;
          teacher_notes: string | null;
          is_featured: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          student_id: string;
          assignment_id?: string | null;
          title: string;
          description?: string | null;
          artifact_type: PortfolioArtifactType;
          file_path?: string | null;
          link_url?: string | null;
          text_content?: string | null;
          submitted_date?: string;
          teacher_notes?: string | null;
          is_featured?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["portfolio_items"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "portfolio_items_student_id_fkey";
            columns: ["student_id"];
            isOneToOne: false;
            referencedRelation: "students";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "portfolio_items_assignment_id_fkey";
            columns: ["assignment_id"];
            isOneToOne: false;
            referencedRelation: "assignments";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: Record<string, never>;
    Functions: {
      is_admin: {
        Args: Record<string, never>;
        Returns: boolean;
      };
      has_course_access: {
        Args: { target_course_id: string };
        Returns: boolean;
      };
    };
    Enums: {
      calendar_day_type: CalendarDayType;
      lesson_segment_key: LessonSegmentKey;
      assignment_type: AssignmentType;
      teks_mastery_status: TeksMasteryStatus;
      question_type: QuestionType;
      assessment_variant: AssessmentVariant;
      pacing_accuracy: PacingAccuracy;
      engagement_level: EngagementLevel;
      prep_category: PrepCategory;
      prep_priority: PrepPriority;
      portfolio_artifact_type: PortfolioArtifactType;
    };
    CompositeTypes: Record<string, never>;
  };
};
