import { BarChart3, ClipboardList, FileUp, GraduationCap, Mail, Settings, UsersRound } from "lucide-react";
import type { Actor } from "@/lib/server";

const items = [
  ["/", "Дашборд", BarChart3],
  ["/applications", "Кандидаты", UsersRound],
  ["/teacher", "Проверка CV", GraduationCap],
  ["/import", "Импорт", FileUp],
  ["/mail", "Почта", Mail],
  ["/selection", "Набор", ClipboardList],
  ["/settings", "Настройки", Settings],
] as const;

export function AppShell({ actor, children }: { actor: Actor; children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-950">
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-[1500px] items-center justify-between gap-4 px-4 sm:px-6">
          <a href="/" className="flex items-center gap-3">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-[#172554] text-sm font-black text-white">M</span>
            <span><strong className="block text-[15px] leading-none">Mentory Ops</strong><small className="mt-1 block text-xs text-slate-500">Tech Orda 2026</small></span>
          </a>
          <div className="flex min-w-0 items-center gap-3 text-right"><div><p className="truncate text-sm font-semibold">{actor.name}</p><p className="text-xs text-slate-500">{actor.role}</p></div><form action="/auth/signout" method="post"><button className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50">Выйти</button></form></div>
        </div>
      </header>
      <div className="mx-auto grid max-w-[1500px] grid-cols-1 lg:grid-cols-[220px_minmax(0,1fr)]">
        <aside className="border-b border-slate-200 bg-white lg:min-h-[calc(100vh-64px)] lg:border-b-0 lg:border-r">
          <nav className="scrollbar-none flex gap-1 overflow-x-auto p-3 lg:sticky lg:top-16 lg:flex-col lg:p-4" aria-label="Основная навигация">
            {items.map(([href, label, Icon]) => (
              <a key={href} href={href} className="flex shrink-0 items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-blue-50 hover:text-blue-900">
                <Icon className="h-4 w-4" />{label}
              </a>
            ))}
          </nav>
        </aside>
        <main className="min-w-0 p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
