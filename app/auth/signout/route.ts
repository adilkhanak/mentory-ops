import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { SESSION_COOKIE } from "@/lib/simple-auth";

export async function POST(req:NextRequest){
  if(process.env.SIMPLE_AUTH!=="true"){
    const supabase=await createSupabaseServerClient();
    await supabase.auth.signOut();
  }
  const response=NextResponse.redirect(new URL("/login",req.url),303);
  response.cookies.set(SESSION_COOKIE,"",{httpOnly:true,secure:process.env.NODE_ENV==="production",sameSite:"lax",path:"/",maxAge:0});
  return response;
}
