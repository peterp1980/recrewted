import { NextResponse, type NextRequest } from "next/server";
import { careerSlugForHost } from "@/lib/careers/host";
import { updateSession } from "@/lib/supabase/middleware";
import { siteUrl } from "@/lib/site";

export async function middleware(request: NextRequest) {
  // Customer domains (e.g. karriere.hafermann-reisen.de): the start page is the customer's career page.
  // Job pages, the application form and tests keep their paths under that domain.
  const slug = await careerSlugForHost(request.headers.get("host"));
  if (slug) {
    const path = request.nextUrl.pathname;
    if (path === "/") {
      const url = request.nextUrl.clone();
      url.pathname = `/karriere/${slug}`;
      return NextResponse.rewrite(url);
    }
    // Internal areas stay on recrewted's own domain.
    if (path.startsWith("/admin") || path.startsWith("/portal") || path.startsWith("/login") || path.startsWith("/vorschau")) {
      return NextResponse.redirect(new URL(path, siteUrl()));
    }
  }
  return updateSession(request);
}

export const config = {
  // Skip static files and images.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"],
};
