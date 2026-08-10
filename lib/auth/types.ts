export type AuthActionState = {
  error?: string;
  fieldErrors?: Record<string, string[] | undefined>;
  success?: boolean;
  message?: string;
};

export const initialAuthActionState: AuthActionState = {};
