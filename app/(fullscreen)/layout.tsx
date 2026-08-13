// Deliberately no Shell/NavRail here — pages in this group (currently
// just the bell ringer display view) want the full viewport for
// projecting, not the app chrome. Auth is still enforced globally by
// middleware; this group only opts out of the *layout*, not protection.
export default function FullscreenLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen bg-cream">{children}</div>;
}
