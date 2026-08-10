"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { checkRateLimit, recordAttempt, rateLimitMessage } from "@/lib/auth/rate-limit";
import { buildRateLimitIdentifiers } from "@/lib/auth/identifiers";
import { mapSupabaseAuthError } from "@/lib/auth/errors";
import { accountExistsForEmail } from "@/lib/auth/account";
import {
  signUpSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from "@/lib/auth/validation";
import type { AuthActionState } from "@/lib/auth/types";

function getSiteUrl(): string {
  return process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
}

/** Guards the "next" redirect target against open-redirect abuse. */
function safeNextPath(value: FormDataEntryValue | null): string {
  if (typeof value !== "string" || value.length === 0) return "/dashboard";
  if (!value.startsWith("/") || value.startsWith("//")) return "/dashboard";
  return value;
}

// FormData.get() returns null for a missing field; our schemas are all
// plain z.string()-based, which reject null outright (.optional() only
// permits undefined). Every field in these forms is always present in the
// real HTML forms, but this keeps a missing/tampered field a normal
// validation error instead of a thrown exception.
function formString(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

export async function signUpAction(
  _prevState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const parsed = signUpSchema.safeParse({
    name: formString(formData, "name"),
    school: formString(formData, "school"),
    email: formString(formData, "email"),
    password: formString(formData, "password"),
  });

  if (!parsed.success) {
    return {
      error: "Check the highlighted fields.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const { name, school, email, password } = parsed.data;
  const identifiers = buildRateLimitIdentifiers(email);

  const rate = await checkRateLimit("signup", identifiers);
  if (!rate.allowed) {
    return { error: rateLimitMessage(rate.retryAfterSeconds) };
  }

  const supabase = createClient();
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: name, school: school ?? null },
      emailRedirectTo: `${getSiteUrl()}/auth/callback?next=/dashboard`,
    },
  });

  await recordAttempt("signup", identifiers, !error);

  if (error) {
    return { error: mapSupabaseAuthError(error) };
  }

  return {
    success: true,
    message: "Check your email to confirm your account before signing in.",
  };
}

export async function signInAction(
  _prevState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const parsed = loginSchema.safeParse({
    email: formString(formData, "email"),
    password: formString(formData, "password"),
  });

  if (!parsed.success) {
    return {
      error: "Check the highlighted fields.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const { email, password } = parsed.data;
  const identifiers = buildRateLimitIdentifiers(email);
  const next = safeNextPath(formData.get("next"));

  const rate = await checkRateLimit("login", identifiers);
  if (!rate.allowed) {
    return { error: rateLimitMessage(rate.retryAfterSeconds) };
  }

  const supabase = createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  await recordAttempt("login", identifiers, !error);

  if (error) {
    // Supabase deliberately returns the same "invalid credentials" error
    // for a wrong password and a non-existent account. The product wants
    // the two distinguished, so we make one extra lookup here — see
    // accountExistsForEmail() for the enumeration-risk trade-off.
    const exists = await accountExistsForEmail(email);
    if (!exists) {
      return {
        error: "No account found with that email. Check the address, or sign up.",
      };
    }
    return { error: "Incorrect email or password." };
  }

  redirect(next);
}

export async function signOutAction(): Promise<void> {
  const supabase = createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

export async function requestPasswordResetAction(
  _prevState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const parsed = forgotPasswordSchema.safeParse({
    email: formString(formData, "email"),
  });

  if (!parsed.success) {
    return {
      error: "Check the highlighted fields.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const { email } = parsed.data;
  const identifiers = buildRateLimitIdentifiers(email);

  const rate = await checkRateLimit("password_reset", identifiers);
  if (!rate.allowed) {
    return { error: rateLimitMessage(rate.retryAfterSeconds) };
  }

  const supabase = createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${getSiteUrl()}/auth/callback?next=/reset-password`,
  });

  await recordAttempt("password_reset", identifiers, !error);

  // Same message regardless of outcome: unlike login, there's no product
  // requirement to reveal whether the email has an account, and Supabase
  // itself doesn't reveal that here either.
  return {
    success: true,
    message: "If an account exists for that email, we've sent a reset link.",
  };
}

export async function updatePasswordAction(
  _prevState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const parsed = resetPasswordSchema.safeParse({
    password: formString(formData, "password"),
    confirmPassword: formString(formData, "confirmPassword"),
  });

  if (!parsed.success) {
    return {
      error: "Check the highlighted fields.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "This reset link has expired. Request a new one." };
  }

  const { error } = await supabase.auth.updateUser({
    password: parsed.data.password,
  });

  if (error) {
    return { error: mapSupabaseAuthError(error) };
  }

  redirect("/dashboard");
}
