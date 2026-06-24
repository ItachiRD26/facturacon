import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getTenantSlugFromHost } from "@/lib/tenant/get-subdomain";

const SESSION_COOKIE = "__session";
const ROOT_DOMAIN     = process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? "localhost:3000";

// Rutas públicas en el dominio raíz (marketing, auth, sesión).
const PUBLIC_ROOT_PATHS = ["/", "/precios", "/login", "/registro", "/api/auth/session", "/_next", "/favicon.ico"];

// Rutas públicas dentro de un subdominio de tenant: DGII llama a /fe/* sin
// cookies de sesión. Estas rutas viven en app/fe/* (no bajo app/sites/[slug]/)
// y resuelven el tenant ellas mismas a partir del host — no se reescriben.
const PUBLIC_TENANT_PATHS = ["/fe/", "/_next", "/favicon.ico"];

function isPublic(pathname: string, list: string[]): boolean {
  return list.some((p) => pathname === p || pathname.startsWith(p));
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const host = request.headers.get("host") ?? "";
  const slug = getTenantSlugFromHost(host, ROOT_DOMAIN);
  const session = request.cookies.get(SESSION_COOKIE)?.value;

  // ── Dominio raíz: marketing + panel de administración/suscripción ──
  if (!slug) {
    if (isPublic(pathname, PUBLIC_ROOT_PATHS)) {
      if (pathname === "/login" && session) {
        return NextResponse.redirect(new URL("/panel", request.url));
      }
      return NextResponse.next();
    }
    if (!session) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("redirect", pathname);
      return NextResponse.redirect(loginUrl);
    }
    return NextResponse.next();
  }

  // ── Subdominio de tenant: rutas /fe/* (callbacks de DGII) pasan tal cual ──
  if (isPublic(pathname, PUBLIC_TENANT_PATHS)) {
    return NextResponse.next();
  }

  if (!session) {
    return NextResponse.redirect(
      new URL(`https://${ROOT_DOMAIN}/login?redirect=${encodeURIComponent(pathname)}`, request.url)
    );
  }

  // Reescribe a app/sites/[slug]/... — más confiable que pasar el slug por
  // header, porque Next.js garantiza que `params.slug` llegue al layout/page
  // (probado: forwardear vía request.headers no llegaba de forma consistente
  // a los Server Components anidados bajo un layout).
  const url = request.nextUrl.clone();
  url.pathname = `/sites/${slug}${pathname}`;
  return NextResponse.rewrite(url);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
