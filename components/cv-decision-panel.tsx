"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/status-badge";

export function CvDecisionPanel({id,currentStatus}:{id:string;currentStatus:string}){
  const router=useRouter();const [comment,setComment]=useState("");const [busy,setBusy]=useState(false);
  async function decide(cvStatus:string){
    setBusy(true);try{const r=await fetch(`/api/applications/${id}`,{method:"PATCH",headers:{"content-type":"application/json"},body:JSON.stringify({cvStatus,cvComment:comment})});const data=await r.json() as Record<string,string>;if(!r.ok)throw new Error(data.error||"Ошибка");toast.success("Решение сохранено");setComment("");router.refresh()}catch(error){toast.error(error instanceof Error?error.message:"Ошибка")}finally{setBusy(false)}
  }
  return <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-center justify-between"><h2 className="font-bold">Решение по CV</h2><StatusBadge value={currentStatus}/></div><textarea value={comment} onChange={e=>setComment(e.target.value)} placeholder="Комментарий преподавателя" className="mt-3 min-h-20 w-full rounded-xl border border-slate-200 p-3 text-sm outline-none focus:border-blue-500"/><div className="mt-3 flex flex-wrap gap-2"><Button disabled={busy} onClick={()=>decide("APPROVED")}>Одобрить</Button><Button disabled={busy} variant="outline" onClick={()=>decide("MAYBE")}>В резерв</Button><Button disabled={busy} variant="destructive" onClick={()=>decide("REJECTED")}>Отклонить</Button><Button disabled={busy} variant="ghost" onClick={()=>decide("NOT_REVIEWED")}>Вернуть в очередь</Button></div></section>
}
