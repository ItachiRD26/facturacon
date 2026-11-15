import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getTenantSlugFromHost } from "@/lib/tenant/get-subdomain";

const SESSION_COOKIE = "__session";
const ROOT_DOMAIN     = process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? "localhost:3000";

// Rutas públicas en el dominio raíz (marketing, auth, sesión).
const PUBLIC_ROOT_PATHS = [
  "/", "/login", "/registro", "/api/auth/session", "/_next", "/favicon.ico",
  "/demo", "/terminos", "/privacidad", "/api/validate-rnc", "/api/lista-espera", "/empresas", "/api/contacto-comercial", "/robots.txt", "/sitemap.xml",
  // /fe/* en el dominio raíz no tiene empresa: responde 404 en XML en vez de
  // mandar a la DGII a una pantalla de login.
  "/fe",
];

// Rutas públicas dentro de un subdominio de tenant. "/api" es crítico: todas
// las rutas API viven en app/api/... (no bajo app/sites/[slug]/api/...), así
// que si se reescriben igual que una página normal, Next.js busca una ruta
// que no existe y responde 404 — rompía TODA llamada fetch("/api/...") hecha
// desde cualquier página del subdominio de un tenant (facturas, cotizaciones,
// etc.), apenas un tenant llegaba a "activo" con subdominio propio. Cada ruta
// API ya hace su propia verificación de sesión/rol internamente
// (getSessionUid(), requireTenantActivo(), etc.), así que no necesita que el
// middleware la bloquee. /fe/* (callbacks de DGII) sigue el mismo patrón:
// vive en app/fe/*, resuelve el tenant desde el host, no se reescribe.
const PUBLIC_TENANT_PATHS = ["/fe/", "/api", "/empleado", "/_next", "/favicon.ico"];

function esHostLocal(hostname: string): boolean {
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname.endsWith(".localhost");
}

// URL del dominio raíz a partir del host REAL de la petición, no de la env
// var a secas — igual que cookieDomainPara() en /api/auth/session. En local,
// NEXT_PUBLIC_ROOT_DOMAIN sigue fijo en facturacon.com.do (necesario para
// producción), así que redirigir con ese valor + https sacaría al que está
// probando en localhost hacia el sitio real. Aquí en cambio: mismo protocolo
// (http) y mismo puerto que ya está usando, solo cambiando "algo.localhost"
// por "localhost".
function urlRaiz(hostHeader: string): string {
  const hostname = hostHeader.split(":")[0];
  const puerto = hostHeader.includes(":") ? `:${hostHeader.split(":")[1]}` : "";
  if (esHostLocal(hostname)) return `http://localhost${puerto}`;
  return `https://${ROOT_DOMAIN}`;
}

function isPublic(pathname: string, list: string[]): boolean {
  // "/" debe matchear solo la raíz exacta — con startsWith("/") a secas
  // cualquier pathname la matchea (todos empiezan con "/"), lo que volvía
  // "público" cualquier ruta del dominio raíz (incl. /onboarding, /panel).
  return list.some((p) => {
    if (p === "/") return pathname === "/";
    return pathname === p || pathname.startsWith(p.endsWith("/") ? p : `${p}/`);
  });
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const host = request.headers.get("host") ?? "";
  const slug = getTenantSlugFromHost(host, ROOT_DOMAIN);
  const session = request.cookies.get(SESSION_COOKIE)?.value;

  // /fe/* (servicio receptor que llama la DGII): las rutas de Next.js distinguen
  // mayúsculas en Linux/Vercel y la DGII documenta URLs como
  // ".../api/ValidacionCertificado". Se reescribe (nunca redirect: un redirect
  // convertiría el POST en GET) a minúsculas, que es como están las carpetas.
  if (pathname.toLowerCase().startsWith("/fe/") && pathname !== pathname.toLowerCase()) {
    const url = request.nextUrl.clone();
    url.pathname = pathname.toLowerCase();
    return NextResponse.rewrite(url);
  }

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
      loginUrl.searchParams.set("redirect", pathname + request.nextUrl.search);
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
      new URL(`${urlRaiz(host)}/login?redirect=${encodeURIComponent(pathname + request.nextUrl.search)}`, request.url)
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
