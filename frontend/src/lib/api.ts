export function getApiBase(): string {
  // 1. In the browser (Client-side), ALWAYS use relative path ""
  // Requests will automatically route to current domain (e.g. /get/soccer/...)
  if (typeof window !== "undefined") {
    return "";
  }

  // 2. Vercel deployment SSR environment
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }

  // 3. Explicit custom external API URL (non-localhost)
  if (process.env.NEXT_PUBLIC_API_URL && !process.env.NEXT_PUBLIC_API_URL.includes("localhost")) {
    return process.env.NEXT_PUBLIC_API_URL.replace(/\/$/, "");
  }

  // 4. Local development fallback
  return process.env.NODE_ENV === "production" ? "" : "http://localhost:3050";
}

export async function fetchAPI<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const base = getApiBase();
  const cleanEndpoint = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
  const url = `${base}${cleanEndpoint}`;

  const res = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
  });

  if (!res.ok) {
    throw new Error(`API error: ${res.status} ${res.statusText}`);
  }

  return res.json();
}
