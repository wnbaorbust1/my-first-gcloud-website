import { signOutAction } from "@/lib/auth/actions";

export function SignOutButton({ className }: { className?: string }) {
  return (
    <form action={signOutAction}>
      <button
        type="submit"
        className={
          className ??
          "border border-slate/40 px-3 py-1.5 text-sm text-ink transition-colors hover:bg-rose-gold/10"
        }
      >
        Sign out
      </button>
    </form>
  );
}
