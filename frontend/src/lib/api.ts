export function getApiBase(): string {
  // If explicitly specified in environment variable with custom domain (non-localhost)
  if (process.env.NEXT_PUBLIC_API_URL && !process.env.NEXT_PUBLIC_API_URL.includes("localhost")) {
    return process.env.NEXT_PUBLIC_API_URL.replace(/\/$/, "");
  }

  // In the browser, ALWAYS use relative path (e.g. `/get/soccer/...`)
  // This automatically routes to the same origin on Vercel production, preview, and dev!
  if (typeof window !== "undefined") {
    return "";
  }

  // For Server-Side Rendering (SSR) fallback
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL.replace(/\/$/, "");
  }

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
