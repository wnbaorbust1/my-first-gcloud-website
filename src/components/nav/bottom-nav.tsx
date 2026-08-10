"use client";

import { LogOut, Menu } from "lucide-react";
import { signOut } from "next-auth/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

import { Modal, ModalContent, ModalTitle } from "@/components/ui/modal";
import { cn } from "@/lib/utils";

import { BOTTOM_NAV_ITEMS, MORE_NAV_ITEMS } from "./nav-items";

export function BottomNav() {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);

  const items = [
    ...BOTTOM_NAV_ITEMS,
    { label: "More", href: "__more__", icon: Menu },
  ];

  return (
    <>
      <nav
        className="fixed inset-x-0 bottom-0 z-40 flex h-16 items-stretch border-t border-navy-100 bg-surface md:hidden"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        {items.map((item) => {
          const Icon = item.icon;
          const active =
            item.href !== "__more__" &&
            (pathname === item.href || pathname.startsWith(`${item.href}/`));

          if (item.href === "__more__") {
            return (
              <button
                key="more"
                type="button"
                onClick={() => setMoreOpen(true)}
                className="flex flex-1 flex-col items-center justify-center gap-1 text-navy-500"
              >
                <Icon className="h-5 w-5" aria-hidden="true" />
                <span className="text-[11px] font-medium">{item.label}</span>
              </button>
            );
          }

          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex flex-1 flex-col items-center justify-center gap-1",
                active ? "text-navy-900" : "text-navy-400",
              )}
            >
              <Icon className="h-5 w-5" aria-hidden="true" />
              <span className="text-[11px] font-medium">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <Modal open={moreOpen} onOpenChange={setMoreOpen}>
        <ModalContent>
          <ModalTitle>More</ModalTitle>
          <div className="mt-4 grid grid-cols-2 gap-2">
            {MORE_NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMoreOpen(false)}
                  className="flex items-center gap-2.5 rounded-xl border border-navy-100 px-3 py-3 text-sm font-medium text-navy-700 hover:bg-navy-50"
                >
                  <Icon className="h-4.5 w-4.5" aria-hidden="true" />
                  {item.label}
                </Link>
              );
            })}
            <button
              type="button"
              onClick={() => signOut({ callbackUrl: "/" })}
              className="flex items-center gap-2.5 rounded-xl border border-navy-100 px-3 py-3 text-sm font-medium text-navy-700 hover:bg-navy-50"
            >
              <LogOut className="h-4.5 w-4.5" aria-hidden="true" />
              Log out
            </button>
          </div>
        </ModalContent>
      </Modal>
    </>
  );
}
