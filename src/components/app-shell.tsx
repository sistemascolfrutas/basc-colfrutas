"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { LogoutButton } from "@/components/logout-button";

type NavItem = {
  href: string;
  label: string;
};

export function AppShell({
  children,
  navItems,
  userEmail,
  userName,
  userRole,
}: {
  children: React.ReactNode;
  navItems: NavItem[];
  userEmail: string;
  userName: string | null;
  userRole: string;
}) {
  const pathname = usePathname();

  return (
    <>
      <header className="sticky top-0 z-50 border-b border-white/60 bg-white/80 backdrop-blur-xl">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-6 px-6 py-4 md:px-10">
          <div className="flex items-center gap-4">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-950 text-sm font-bold text-white">
              CB
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.28em] text-emerald-700">
                COLFRUTAS BASC
              </p>
              <p className="text-sm text-slate-600">
                Trazabilidad de unidades de carga
              </p>
            </div>
          </div>

          <div className="hidden items-center gap-4 lg:flex">
            <nav className="flex flex-wrap items-center gap-2">
              {navItems.map((item) => {
                const active = pathname === item.href;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={[
                      "rounded-full px-4 py-2 text-sm font-semibold transition",
                      active
                        ? "bg-slate-950 text-white"
                        : "text-slate-700 hover:bg-slate-100",
                    ].join(" ")}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>

            <div className="flex items-center gap-3">
              <div className="text-right">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">
                  Usuario activo
                </p>
                <p className="text-sm font-medium text-slate-700">
                  {userName || userEmail}
                </p>
                <p className="text-xs text-slate-500">{userRole}</p>
              </div>
              <LogoutButton />
            </div>
          </div>
        </div>

        <div className="border-t border-slate-100 px-4 py-3 lg:hidden">
          <div className="mx-auto flex w-full max-w-7xl flex-col gap-3 px-2">
            <div className="flex gap-2 overflow-x-auto">
              {navItems.map((item) => {
                const active = pathname === item.href;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={[
                      "whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold transition",
                      active
                        ? "bg-slate-950 text-white"
                        : "bg-slate-100 text-slate-700",
                    ].join(" ")}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </div>

            <div className="flex items-center justify-between gap-3 rounded-2xl bg-slate-50 px-3 py-3">
              <div className="min-w-0">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">
                  Usuario activo
                </p>
                <p className="truncate text-sm font-medium text-slate-700">
                  {userName || userEmail}
                </p>
                <p className="truncate text-xs text-slate-500">{userRole}</p>
              </div>
              <LogoutButton />
            </div>
          </div>
        </div>
      </header>

      {children}
    </>
  );
}
