import type { MetadataRoute } from "next";

import { siteUrl } from "@/lib/site";

const routes = [
  { path: "/", priority: 1 },
  { path: "/herramientas/semitonos-dtf", priority: 0.9 },
  { path: "/guias/semitonos-para-dtf", priority: 0.8 },
  { path: "/pro", priority: 0.7 },
] as const;

export default function sitemap(): MetadataRoute.Sitemap {
  return routes.map((route) => ({
    url: `${siteUrl}${route.path}`,
    lastModified: new Date(),
    changeFrequency: "weekly",
    priority: route.priority,
  }));
}
