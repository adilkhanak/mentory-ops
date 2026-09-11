import { LoginForm } from "@/components/login-form";

export default async function LoginPage({ searchParams }: { searchParams: Promise<Record<string,string|undefined>> }) {
  const params = await searchParams;
  return <main className="grid min-h-screen place-items-center bg-slate-50 p-4">
    <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-7 shadow-xl shadow-slate-200/50">
      <div className="mb-7 flex items-center gap-3">
        <span className="grid h-11 w-11 place-items-center rounded-2xl bg-[#172554] font-black text-white">M</span>
        <div><h1 className="text-xl font-bold">Mentory Ops</h1><p className="text-sm text-slate-500">Приватная система отбора</p></div>
      </div>
      {params.error === "access" && <p className="mb-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">У этого email нет доступа. Попросите администратора добавить вас.</p>}
      <LoginForm next={params.next ?? "/"} />
    </div>
  </main>;
}
