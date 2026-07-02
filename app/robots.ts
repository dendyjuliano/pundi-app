import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // Semua halaman ini butuh login — crawler tidak akan pernah bisa
      // melihat isinya (cuma mentok di redirect ke /login), tapi
      // di-disallow eksplisit juga supaya tidak buang crawl budget.
      disallow: [
        "/api/",
        "/dashboard",
        "/budget",
        "/expenses",
        "/reports",
        "/settings",
        "/admin",
        "/onboarding",
        "/panduan",
      ],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
