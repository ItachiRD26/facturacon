import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const dominio = (process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? "facturacon.com.do").split(":")[0];
  return ["", "/login", "/terminos", "/privacidad"].map((ruta) => ({ url: `https://${dominio}${ruta}` }));
}
