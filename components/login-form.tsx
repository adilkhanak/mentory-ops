"use client";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export function LoginForm({ next }: { next: string }) {
  const [username,setUsername]=useState("");
  const [password,setPassword]=useState("");
  const [busy,setBusy]=useState(false);
  async function submit(e:React.FormEvent){
    e.preventDefault();setBusy(true);
    try{
      const r=await fetch("/api/auth/login",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({username,password,next})});
      const data=await r.json() as Record<string,string>;
      if(!r.ok)throw new Error(data.error||"Не удалось войти");
      window.location.href=data.next||"/";
    }catch(error){toast.error(error instanceof Error?error.message:"Ошибка входа")}finally{setBusy(false)}
  }
  return <form onSubmit={submit} className="space-y-4">
    <label className="block text-sm font-semibold">Логин<input autoComplete="username" value={username} onChange={e=>setUsername(e.target.value)} required className="mt-1.5 h-11 w-full rounded-xl border border-slate-200 px-3 font-normal outline-none focus:border-blue-500"/></label>
    <label className="block text-sm font-semibold">Пароль<input type="password" autoComplete="current-password" value={password} onChange={e=>setPassword(e.target.value)} required className="mt-1.5 h-11 w-full rounded-xl border border-slate-200 px-3 font-normal outline-none focus:border-blue-500"/></label>
    <Button type="submit" className="w-full" disabled={busy}>{busy?"Входим…":"Войти"}</Button>
    <p className="text-center text-xs text-slate-500">Закрытый доступ для команды Mentory.</p>
  </form>;
}
