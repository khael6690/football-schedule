export function getApiBase(): string {
  let url = (process.env.NEXT_PUBLIC_API_URL || "").trim();

  // 1. If NEXT_PUBLIC_API_URL is configured
  if (url !== "") {
    // If user configured http:// on a remote domain (e.g. vercel.app), force https://
    // Vercel strictly rejects http:// with a 308 Permanent Redirect to https://
    if (url.startsWith("http://") && !url.includes("localhost") && !url.includes("127.0.0.1")) {
      url = url.replace("http://", "https://");
    }
    return url.replace(/\/$/, "");
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
