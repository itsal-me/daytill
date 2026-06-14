import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://daytill.app";
    const now = new Date();

    return [
        "",
        "/about-us",
        "/contact-us",
        "/privacy-policy",
        "/terms-and-conditions",
    ].map((path) => ({
        url: `${siteUrl}${path}`,
        lastModified: now,
        changeFrequency: "weekly" as const,
        priority: path === "" ? 1 : 0.8,
    }));
}
