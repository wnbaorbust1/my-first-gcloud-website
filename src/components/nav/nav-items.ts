import {
  BookOpen,
  CalendarDays,
  Compass,
  CreditCard,
  DollarSign,
  Home,
  Hammer,
  LibraryBig,
  Settings,
  Sparkles,
  Target,
  TrendingUp,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
}

/** Desktop sidebar order (spec Task 8). */
export const SIDEBAR_ITEMS: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: Home },
  { label: "My Roadmap", href: "/roadmap", icon: Compass },
  { label: "Build", href: "/build", icon: Hammer },
  { label: "Blueprint AI", href: "/ai", icon: Sparkles },
  { label: "My Blueprint", href: "/my-blueprint", icon: BookOpen },
  { label: "Goals", href: "/goals", icon: Target },
  { label: "Money", href: "/money", icon: DollarSign },
  { label: "Resources", href: "/resources", icon: LibraryBig },
  { label: "Sessions", href: "/sessions", icon: CalendarDays },
  { label: "Progress", href: "/progress", icon: TrendingUp },
  { label: "Billing", href: "/billing", icon: CreditCard },
  { label: "Settings", href: "/settings", icon: Settings },
];

/** Mobile bottom nav — 4 primary destinations plus a "More" sheet. */
export const BOTTOM_NAV_ITEMS: NavItem[] = [
  { label: "Home", href: "/dashboard", icon: Home },
  { label: "Roadmap", href: "/roadmap", icon: Compass },
  { label: "Build", href: "/build", icon: Hammer },
  { label: "AI", href: "/ai", icon: Sparkles },
];

/** Everything else, tucked behind "More" on mobile. */
export const MORE_NAV_ITEMS: NavItem[] = SIDEBAR_ITEMS.filter(
  (item) => !BOTTOM_NAV_ITEMS.some((b) => b.href === item.href),
);
