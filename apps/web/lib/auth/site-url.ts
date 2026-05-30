import { headers } from "next/headers";

function normalizeSiteUrl(value: string) {
  const url = value.trim().replace(/\/+$/, "");

  if (!url) return null;

  return url.startsWith("http://") || url.startsWith("https://")
    ? url
    : `https://${url}`;
}

export async function getSiteUrl() {
  const requestHeaders = await headers();
  const host =
    requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host");

  if (host) {
    const protocol =
      requestHeaders.get("x-forwarded-proto") ??
      (host.startsWith("localhost") ? "http" : "https");

    return `${protocol}://${host}`;
  }

  const configuredUrl = normalizeSiteUrl(
    process.env.NEXT_PUBLIC_SITE_URL ?? "",
  );

  if (configuredUrl) return configuredUrl;

  const vercelUrl = normalizeSiteUrl(
    process.env.VERCEL_PROJECT_PRODUCTION_URL ?? process.env.VERCEL_URL ?? "",
  );

  return vercelUrl ?? "http://localhost:3000";
}

export async function getAuthCallbackUrl(type: "signup" | "recovery") {
  return `${await getSiteUrl()}/auth/callback/${type}`;
}
