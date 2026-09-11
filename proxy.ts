import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, simpleAuthEnabled, verifySessionToken } from "@/lib/simple-auth";

export async function proxy(request: NextRequest) {
  if (simpleAuthEnabled()) {
    const pathname = request.nextUrl.pathname;
    const publicPath = pathname === "/login" || pathname === "/api/auth/login" || pathname.startsWith("/api/cron/") || pathname === "/api/mail/ingest";
    if (publicPath) return NextResponse.next({ request });
    const authenticated = await verifySessionToken(request.cookies.get(SESSION_COOKIE)?.value);
    if (!authenticated) {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      url.search = "";
      url.searchParams.set("next", `${pathname}${request.nextUrl.search}`);
      return NextResponse.redirect(url);
    }
    return NextResponse.next({ request });
  }

  if (process.env.OPEN_ACCESS === "true") {
    return NextResponse.next({ request });
  }

  let response = NextResponse.next({ request });
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (items) => {
          items.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          items.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    },
  );
  await supabase.auth.getUser();
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.svg|api/cron).*)"],
};
