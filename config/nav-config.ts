import { KeyRound, LayoutDashboard, type LucideIcon } from "lucide-react";

export type NavItem = {
  title: string;
  href: string;
  icon: LucideIcon;
};

export const NAV_ITEMS: NavItem[] = [
  { title: "Overview", href: "/dashboard", icon: LayoutDashboard },
  { title: "API Keys", href: "/dashboard/api-keys", icon: KeyRound },
];
