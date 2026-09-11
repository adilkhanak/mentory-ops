"use client";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export function LoginForm({ next }: { next: string }) {
  const [email,setEmail]=useState("info@mentory.pro");
  const [busy,setBusy]=useState(false);
  const [sent,setSent]=useState(false);
  async function submit(e:React.FormEvent){
    e.preventDefault();setBusy(true);
    try{
      const r=await fetch("/api/auth/login",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({email,next})});
      const data=await r.json() as Record<string,string>;
      if(!r.ok)throw new Error(data.error||"Не удалось отправить ссылку");
      setSent(true);
    }catch(error){toast.error(error instanceof Error?error.message:"Ошибка входа")}finally{setBusy(false)}
  }
  if(sent)return <div className="rounded-2xl bg-emerald-50 p-5 text-sm text-emerald-900"><p className="font-bold">Ссылка отправлена</p><p className="mt-2">Откройте письмо на {email} и нажмите кнопку входа. Ссылка одноразовая.</p></div>;
  return <form onSubmit={submit} className="space-y-4">
    <label className="block text-sm font-semibold">Рабочий email<input type="email" value={email} onChange={e=>setEmail(e.target.value)} required className="mt-1.5 h-11 w-full rounded-xl border border-slate-200 px-3 font-normal outline-none focus:border-blue-500"/></label>
    <Button type="submit" className="w-full" disabled={busy}>{busy?"Отправляем…":"Получить ссылку для входа"}</Button>
    <p className="text-center text-xs text-slate-500">Доступ только для приглашённых сотрудников Mentory.</p>
  </form>;
}
