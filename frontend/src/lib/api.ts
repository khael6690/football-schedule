export function getApiBase(): string {
  // 1. If NEXT_PUBLIC_API_URL is configured (Production Vercel or Local .env.local), use it directly
  if (process.env.NEXT_PUBLIC_API_URL && process.env.NEXT_PUBLIC_API_URL.trim() !== "") {
    return process.env.NEXT_PUBLIC_API_URL.replace(/\/$/, "");
  }

  // 2. Fallback for client-side / local dev
  if (typeof window !== "undefined") {
    return "http://localhost:3050";
  }

  // 3. Fallback for server-side
  return "http://localhost:3050";
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
