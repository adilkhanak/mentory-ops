import { NextResponse } from "next/server";
import { getActor } from "@/lib/server";
import { syncMailbox } from "@/lib/mail-sync";

export const maxDuration=60;
export async function POST(){
  const actor=await getActor("/mail");
  if(!["ADMIN","MANAGER"].includes(actor.role))return NextResponse.json({error:"Недостаточно прав"},{status:403});
  try{return NextResponse.json(await syncMailbox())}
  catch(error){console.error(error);return NextResponse.json({error:"Не удалось подключиться к IMAP"},{status:502})}
}
