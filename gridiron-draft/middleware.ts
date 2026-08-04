import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request: { headers: request.headers } });

  const supabase = createServerClient(
    process.env.https://ghbxvotmdephuwwrxrum.supabase.co/rest/v1/!,
    process.env.eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdoYnh2b3RtZGVwaHV3d3J4cnVtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU4MDA5OTIsImV4cCI6MjEwMTM3Njk5Mn0.5IOF8QtwPFXz7NBWS4voPDqAv45KaXt-Dg2G06xNky0!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          response.cookies.set({ name, value, ...options });
        },
        remove(name: string, options: CookieOptions) {
          response.cookies.set({ name, value: "", ...options });
        },
      },
    }
  );

  // Refreshes the session cookie if it's expired — keeps Server Components
  // in sync with the client without every page re-checking auth by hand.
  await supabase.auth.getUser();

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
