"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BadgeDollarSign,
  ChartNoAxesCombined,
  Clapperboard,
  Goal,
  Home,
  Camera,
  Settings,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/", label: "Overview", icon: Home },
  { href: "/revenue", label: "Revenue", icon: BadgeDollarSign },
  { href: "/meta-ads", label: "Meta Ads", icon: ChartNoAxesCombined },
  { href: "/funnel", label: "Funnel", icon: Goal },
  { href: "/creative-tracker", label: "Creative Tracker", icon: Clapperboard },
  { href: "/instagram", label: "Instagram", icon: Camera },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="border-b border-sd-border bg-black/[0.92] backdrop-blur-xl md:fixed md:inset-y-0 md:left-0 md:w-64 md:border-b-0 md:border-r">
      <div className="flex h-full flex-col">
        <div className="flex items-center gap-3 px-4 py-4 md:px-5 md:py-6">
          <div className="soundev-icon flex size-9 items-center justify-center rounded-md">
            <Sparkles className="size-4" aria-hidden="true" />
          </div>
          <div>
            <p className="text-sm font-semibold text-zinc-50">Soundev</p>
            <p className="text-xs text-zinc-500">Drum Mastery Suite</p>
          </div>
        </div>
        <nav className="flex gap-1 overflow-x-auto px-3 pb-3 md:flex-col md:overflow-visible md:px-3">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              item.href === "/" ? pathname === "/" : pathname === item.href;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "inline-flex min-w-fit items-center gap-2 rounded-md border border-transparent px-3 py-2 text-sm font-medium text-zinc-400 transition hover:border-sd-border hover:bg-sd-hover/70 hover:text-zinc-50",
                  isActive &&
                    "border-sd-border-strong bg-sd-accent/[0.12] text-sky-100 shadow-[0_0_22px_rgba(47,140,255,0.16)] hover:bg-sd-accent/[0.16] hover:text-sky-100",
                )}
              >
                <Icon className="size-4" aria-hidden="true" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="mt-auto hidden px-5 pb-6 text-xs leading-5 text-zinc-500 md:block">
          Live Stripe and Meta data when configured. Other sources stay in mock fallback.
        </div>
      </div>
    </aside>
  );
}
