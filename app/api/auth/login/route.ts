import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { database } from "@/lib/server";
import { createSessionToken, sessionMaxAge, simpleAuthEnabled, verifyAppCredentials, SESSION_COOKIE } from "@/lib/simple-auth";

export async function POST(req:NextRequest){
  const body=await req.json() as Record<string,unknown>;
  const next=String(body.next??"/");const safeNext=next.startsWith("/")&&!next.startsWith("//")?next:"/";
  if(simpleAuthEnabled()){
    const username=String(body.username??"").trim();
    const password=String(body.password??"");
    if(!verifyAppCredentials(username,password))return NextResponse.json({error:"Неверный логин или пароль"},{status:401});
    const response=NextResponse.json({ok:"true",next:safeNext});
    response.cookies.set(SESSION_COOKIE,await createSessionToken(username),{httpOnly:true,secure:process.env.NODE_ENV==="production",sameSite:"lax",path:"/",maxAge:sessionMaxAge});
    return response;
  }
  const email=String(body.email??"").trim().toLowerCase();
  if(!email.includes("@"))return NextResponse.json({error:"Введите корректный email"},{status:400});
  const invited=await database().prepare("SELECT id FROM users WHERE lower(email)=lower(?)").bind(email).first();
  if(!invited)return NextResponse.json({error:"Этот email не добавлен в систему"},{status:403});
  const supabase=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!,process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!);
  const {error}=await supabase.auth.signInWithOtp({email,options:{emailRedirectTo:`${req.nextUrl.origin}/auth/callback?next=${encodeURIComponent(safeNext)}`}});
  if(error)return NextResponse.json({error:"Не удалось отправить письмо для входа"},{status:500});
  return NextResponse.json({ok:"true"});
}
