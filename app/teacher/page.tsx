import { AppShell } from "@/components/app-shell";
import { CvDecisionPanel } from "@/components/cv-decision-panel";
import { StatusBadge } from "@/components/status-badge";
import { getActor,listApplications } from "@/lib/server";

export const dynamic="force-dynamic";
export default async function TeacherPage({searchParams}:{searchParams:Promise<Record<string,string|undefined>>}){
  const params=await searchParams;
  const actor=await getActor("/teacher");
  const all=(await listApplications(params.q??"",params.course??"")) as Array<Record<string,any>>;
  const rows=params.view==="all"?all:all.filter(r=>r.cv_status==="NOT_REVIEWED");
  const selected=rows.find(r=>r.id===params.candidate)??rows[0]??null;
  return <AppShell actor={actor}><div className="space-y-5">
    <div><p className="text-sm font-semibold text-blue-700">Рабочее место преподавателя</p><h1 className="mt-1 text-3xl font-bold">Проверка CV</h1><p className="mt-2 text-sm text-slate-500">Данные кандидата, резюме и решение — на одном экране.</p></div>
    <form className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:grid-cols-[1fr_220px_180px_auto]">
      <input name="q" defaultValue={params.q} placeholder="ФИО, email или ИИН" className="h-10 rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-blue-500"/>
      <select name="course" defaultValue={params.course} className="h-10 rounded-xl border border-slate-200 px-3 text-sm"><option value="">Все курсы</option><option value="junior-frontend">Junior Frontend</option><option value="middle-frontend">Middle Frontend</option></select>
      <select name="view" defaultValue={params.view??"pending"} className="h-10 rounded-xl border border-slate-200 px-3 text-sm"><option value="pending">Ждут проверки</option><option value="all">Все CV</option></select>
      <button className="h-10 rounded-xl bg-[#172554] px-4 text-sm font-semibold text-white">Применить</button>
    </form>
    {selected?<div className="grid gap-5 xl:grid-cols-[340px_minmax(0,1fr)]">
      <aside className="max-h-[840px] overflow-y-auto rounded-2xl border border-slate-200 bg-white p-2 shadow-sm">
        <p className="sticky top-0 z-10 bg-white px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-500">{rows.length} кандидатов</p>
        <div className="space-y-1">{rows.map(r=><a key={r.id} href={`/teacher?view=${params.view??"pending"}&course=${params.course??""}&q=${encodeURIComponent(params.q??"")}&candidate=${r.id}`} className={`block rounded-xl border p-3 transition ${r.id===selected.id?"border-blue-300 bg-blue-50":"border-transparent hover:bg-slate-50"}`}><div className="flex items-start justify-between gap-2"><p className="font-semibold leading-tight">{r.full_name}</p><StatusBadge value={r.cv_status}/></div><p className="mt-1 text-xs text-slate-500">{r.course_name}</p><p className="mt-2 truncate text-xs text-slate-400">{r.region??"Регион не указан"} · {r.email??r.phone??"нет контакта"}</p></a>)}</div>
      </aside>
      <div className="space-y-5">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start"><div><h2 className="text-xl font-bold">{selected.full_name}</h2><p className="mt-1 text-sm text-slate-500">{selected.course_name}</p></div><a href={`/applications/${selected.id}`} className="text-sm font-semibold text-blue-700">Полная карточка →</a></div>
          <dl className="mt-5 grid gap-4 text-sm sm:grid-cols-2 xl:grid-cols-4">{[["ИИН",selected.iin],["Email",selected.email],["Телефон",selected.phone],["Регион",selected.region],["Город",selected.city],["Занятость",selected.employment_status],["Опыт в IT",selected.it_experience],["Образование",selected.education]].map(([k,v])=><div key={k}><dt className="text-xs text-slate-500">{k}</dt><dd className="mt-1 font-medium">{v??"—"}</dd></div>)}</dl>
        </section>
        <CvDecisionPanel id={selected.id} currentStatus={selected.cv_status}/>
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-200 p-4"><div><h2 className="font-bold">Резюме кандидата</h2><p className="text-xs text-slate-500">PDF отображается прямо в системе</p></div>{selected.cv_url&&<a href={selected.cv_url} target="_blank" rel="noreferrer" className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold hover:bg-slate-50">Открыть отдельно</a>}</div>
          {selected.cv_url?<iframe title={`CV — ${selected.full_name}`} src={selected.cv_url} className="h-[720px] w-full bg-slate-100"/>:<div className="grid h-72 place-items-center text-sm text-slate-500">Ссылка на CV отсутствует</div>}
        </section>
      </div>
    </div>:<div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center"><p className="font-semibold">Очередь пуста</p><p className="mt-1 text-sm text-slate-500">По выбранным условиям кандидатов нет.</p></div>}
  </div></AppShell>
}
