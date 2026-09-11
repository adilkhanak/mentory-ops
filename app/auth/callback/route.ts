import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(req:NextRequest){
  const code=req.nextUrl.searchParams.get("code");
  const next=req.nextUrl.searchParams.get("next")??"/";
  if(code){
    const supabase=await createSupabaseServerClient();
    const {error}=await supabase.auth.exchangeCodeForSession(code);
    if(!error)return NextResponse.redirect(new URL(next.startsWith("/")&&!next.startsWith("//")?next:"/",req.url));
  }
  return NextResponse.redirect(new URL("/login?error=callback",req.url));
}
