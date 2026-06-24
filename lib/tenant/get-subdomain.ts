// Extrae el slug de tenant de un hostname, dado el dominio raíz configurado.
// "localhost" siempre se acepta como raíz adicional para poder probar
// subdominios en desarrollo (ej. abc123.localhost:3000) sin tocar DNS/hosts.
export function getTenantSlugFromHost(hostname: string, rootDomain: string): string | null {
  const host = hostname.split(":")[0].toLowerCase();
  const roots = new Set([rootDomain.split(":")[0].toLowerCase(), "localhost"]);

  for (const root of roots) {
    if (host === root || host === `www.${root}`) return null;
    if (host.endsWith(`.${root}`)) {
      const slug = host.slice(0, host.length - root.length - 1);
      return slug || null;
    }
  }
  return null;
}
