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
  | "unpaid";
export type CalendarDayType =
  | "regular"
  | "holiday"
  | "testing"
  | "early_release"
  | "block_day";
export type RateLimitAction = "signup" | "login" | "password_reset";

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
    };
    CompositeTypes: Record<string, never>;
  };
};
