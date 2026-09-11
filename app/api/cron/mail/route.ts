import { NextRequest,NextResponse } from "next/server";
import { syncMailbox } from "@/lib/mail-sync";

export const maxDuration=60;
export async function GET(req:NextRequest){
  if(!process.env.CRON_SECRET||req.headers.get("authorization")!==`Bearer ${process.env.CRON_SECRET}`)return NextResponse.json({error:"Unauthorized"},{status:401});
  try{return NextResponse.json(await syncMailbox())}
  catch(error){console.error(error);return NextResponse.json({error:"IMAP sync failed"},{status:502})}
}
