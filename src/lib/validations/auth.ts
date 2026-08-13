import { z } from "zod";

export const signupSchema = z.object({
  firstName: z.string().trim().min(1, "First name is required").max(100),
  lastName: z.string().trim().min(1, "Last name is required").max(100),
  email: z.string().trim().toLowerCase().email("Enter a valid email address"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(200),
});
export type SignupInput = z.infer<typeof signupSchema>;

export const forgotPasswordSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email address"),
});
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;

export const resetPasswordSchema = z.object({
  token: z.string().min(1, "Missing reset token"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(200),
});
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;

/**
 * Change-password (spec gap found live: Settings had no self-service way
 * to change a password while signed in — only signup and the
 * signed-out forgot/reset-password flow existed). Requires the current
 * password so a hijacked, already-open session can't be used to lock
 * the real owner out.
 */
export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Enter your current password"),
  newPassword: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(200),
});
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
