import { AlertTriangle, ArrowRight, CalendarClock, FileSearch, MailCheck, MapPin, Users } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { StatusBadge } from "@/components/status-badge";
import { dashboard, getActor } from "@/lib/server";
import { regionalTarget } from "@/lib/domain";

export const dynamic = "force-dynamic";
function num(value: unknown) { return Number(value ?? 0); }

export default async function Home() {
  const actor = await getActor("/");
  const data = await dashboard();
  const totalQuota = data.courses.reduce((sum, c) => sum + num(c.quota), 0);
  const regionalAccepted = num((data.regions as Record<string, unknown>)?.regional);
  const target = regionalTarget(totalQuota, num(data.cycle?.regional_minimum));
  const metrics = [
    ["Всего заявок", num((data.totals as Record<string, unknown>)?.total), Users, "text-blue-700 bg-blue-50", "/applications"],
    ["CV ждут проверки", num((data.queues as Record<string, unknown>)?.cv), FileSearch, "text-amber-700 bg-amber-50", "/teacher"],
    ["Мотивации получены", num((data.totals as Record<string, unknown>)?.motivation_received), MailCheck, "text-emerald-700 bg-emerald-50", "/mail"],
    ["Интервью назначены", num((data.totals as Record<string, unknown>)?.interviews), CalendarClock, "text-violet-700 bg-violet-50", "/selection"],
  ] as const;
  return <AppShell actor={actor}>
    <div className="space-y-7">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end"><div><p className="text-sm font-semibold text-blue-700">Текущий цикл</p><h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">Tech Orda 2026</h1><p className="mt-2 text-sm text-slate-500">Дедлайн мотивационных писем: 17 сентября 2026</p></div><a href="/import" className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-[#172554] px-4 text-sm font-semibold text-white hover:bg-blue-950">Загрузить реестр <ArrowRight className="h-4 w-4" /></a></div>
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{metrics.map(([label,value,Icon,tone,href]) => <a href={href} key={label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-md"><div className={`mb-5 grid h-10 w-10 place-items-center rounded-xl ${tone}`}><Icon className="h-5 w-5" /></div><p className="text-3xl font-bold tabular-nums">{value}</p><p className="mt-1 text-sm text-slate-500">{label}</p></a>)}</section>
      <section className="grid gap-5 xl:grid-cols-[1.15fr_.85fr]">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="mb-5 flex items-center justify-between"><div><h2 className="font-bold">Заполнение квот</h2><p className="text-sm text-slate-500">Финально принятые кандидаты</p></div><span className="text-sm font-semibold text-slate-500">{data.courses.reduce((s,c)=>s+num(c.accepted),0)} / {totalQuota}</span></div><div className="space-y-5">{data.courses.map((course) => { const accepted=num(course.accepted), quota=num(course.quota), pct=quota ? Math.min(100,accepted/quota*100):0; return <div key={String(course.id)}><div className="mb-2 flex justify-between gap-3 text-sm"><span className="font-semibold">{String(course.name)}</span><span className="tabular-nums text-slate-500">{accepted} / {quota}</span></div><div className="h-2.5 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-blue-700" style={{width:`${pct}%`}} /></div><p className="mt-1.5 text-xs text-slate-400">Заявок: {num(course.applications)}</p></div>})}</div></div>
        <div className="rounded-2xl border border-slate-200 bg-[#172554] p-5 text-white shadow-sm"><div className="flex items-start justify-between"><div><h2 className="font-bold">Региональная квота</h2><p className="mt-1 text-sm text-blue-200">Минимум {num(data.cycle?.regional_minimum)}% от общего набора</p></div><MapPin className="h-6 w-6 text-blue-300" /></div><p className="mt-8 text-4xl font-bold tabular-nums">{regionalAccepted} <span className="text-xl font-medium text-blue-300">/ {target}</span></p><div className="mt-4 h-2.5 overflow-hidden rounded-full bg-white/15"><div className="h-full rounded-full bg-cyan-300" style={{width:`${target ? Math.min(100,regionalAccepted/target*100):0}%`}} /></div><p className="mt-5 flex items-center gap-2 text-sm text-blue-100"><AlertTriangle className="h-4 w-4" />До минимума: {Math.max(0,target-regionalAccepted)}</p></div>
      </section>
      <section className="grid gap-5 lg:grid-cols-[.75fr_1.25fr]">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><h2 className="font-bold">Очереди</h2><div className="mt-4 space-y-2">{[["Проверить CV",num((data.queues as Record<string, unknown>)?.cv),"/teacher"],["Ждём мотивацию",num((data.queues as Record<string, unknown>)?.motivation),"/applications?status=IN_REVIEW"],["Назначить интервью",num((data.queues as Record<string, unknown>)?.interview),"/selection"],["Принять решение",num((data.queues as Record<string, unknown>)?.decisions),"/selection"]].map(([label,count,href])=><a key={String(label)} href={String(href)} className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3 text-sm font-semibold hover:bg-blue-50"><span>{label}</span><span className="rounded-lg bg-white px-2 py-1 tabular-nums text-blue-800 shadow-sm">{count}</span></a>)}</div></div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-center justify-between"><h2 className="font-bold">Последние кандидаты</h2><a className="text-sm font-semibold text-blue-700" href="/applications">Все кандидаты</a></div>{data.recent.length ? <div className="mt-3 divide-y divide-slate-100">{data.recent.map((row: Record<string, string>)=><a href={`/applications/${row.id}`} key={row.id} className="flex items-center justify-between gap-4 py-3"><div className="min-w-0"><p className="truncate text-sm font-semibold">{row.full_name}</p><p className="truncate text-xs text-slate-500">{row.course}</p></div><StatusBadge value={row.status} /></a>)}</div>:<div className="mt-10 pb-6 text-center"><p className="font-semibold">Реестр пока пуст</p><p className="mt-1 text-sm text-slate-500">Начните с импорта официального файла Tech Orda.</p></div>}</div>
      </section>
    </div>
  </AppShell>;
}
