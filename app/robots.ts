import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const dominio = (process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? "facturacon.com.do").split(":")[0];
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/panel", "/api", "/onboarding", "/fe"] },
    sitemap: `https://${dominio}/sitemap.xml`,
  };
}
