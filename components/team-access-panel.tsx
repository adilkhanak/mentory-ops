"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

type TeamUser = { id: string; email: string; name: string | null; role: string };

export function TeamAccessPanel({ users }: { users: TeamUser[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true);
    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/users", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(Object.fromEntries(form)) });
      const data = await response.json() as Record<string, string>;
      if (!response.ok) throw new Error(data.error || "Ошибка");
      toast.success("Доступ сохранён"); event.currentTarget.reset(); router.refresh();
    } catch (error) { toast.error(error instanceof Error ? error.message : "Ошибка"); }
    finally { setBusy(false); }
  }
  return <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
    <h2 className="font-bold">Доступы команды</h2>
    <p className="mt-1 text-sm text-slate-500">Добавленный сотрудник входит по одноразовой ссылке на свой email.</p>
    <form onSubmit={submit} className="mt-4 grid gap-3 sm:grid-cols-[1fr_1fr_170px_auto]">
      <input name="name" required placeholder="Имя сотрудника" className="h-10 rounded-xl border border-slate-200 px-3 text-sm" />
      <input name="email" required type="email" placeholder="Рабочий email" className="h-10 rounded-xl border border-slate-200 px-3 text-sm" />
      <select name="role" defaultValue="TEACHER" className="h-10 rounded-xl border border-slate-200 px-3 text-sm"><option value="ADMIN">Администратор</option><option value="MANAGER">Менеджер</option><option value="TEACHER">Преподаватель</option><option value="VIEWER">Только просмотр</option></select>
      <Button type="submit" disabled={busy}>{busy ? "Сохраняем…" : "Добавить"}</Button>
    </form>
    <div className="mt-5 divide-y divide-slate-100">{users.map(user => <div key={user.id} className="flex items-center justify-between gap-4 py-3 text-sm"><div><p className="font-semibold">{user.name || user.email}</p><p className="text-xs text-slate-500">{user.email}</p></div><span className="rounded-lg bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-600">{user.role}</span></div>)}</div>
  </section>;
}
