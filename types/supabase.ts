/**
 * Placeholder for the generated Supabase database types.
 *
 * Once the schema exists, replace this file's contents with the output of:
 *   supabase gen types typescript --project-id <project-ref> > types/supabase.ts
 *
 * Keeping the `Database` type exported (even empty) lets lib/supabase/*
 * stay strongly typed against it from day one instead of `any`.
 */
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: Record<string, never>;
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
