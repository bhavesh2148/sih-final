// Smart API Configuration with dynamic port probing (8000 <-> 8080)

let cachedBaseUrl: string | null = null;

export const getApiBaseUrl = async (): Promise<string> => {
  if (typeof window === "undefined") {
    return process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";
  }

  if (cachedBaseUrl) return cachedBaseUrl;

  if (process.env.NEXT_PUBLIC_API_URL) {
    cachedBaseUrl = process.env.NEXT_PUBLIC_API_URL;
    return cachedBaseUrl;
  }

  // Probe port 8000 first, then 8080
  const candidatePorts = [8000, 8080];
  for (const port of candidatePorts) {
    try {
      const res = await fetch(`http://127.0.0.1:${port}/api/v1/reports/dashboard`, {
        method: "GET",
        signal: AbortSignal.timeout(800),
      });
      if (res.ok) {
        cachedBaseUrl = `http://127.0.0.1:${port}`;
        return cachedBaseUrl;
      }
    } catch {
      // Try next port
    }
  }

  return "http://127.0.0.1:8000";
};

export const apiFetch = async (endpoint: string, options?: RequestInit): Promise<Response> => {
  const ports = [8000, 8080];
  
  // If we already know the working port, try it first
  if (cachedBaseUrl) {
    try {
      const url = `${cachedBaseUrl}${endpoint}`;
      return await fetch(url, options);
    } catch {
      cachedBaseUrl = null; // reset cache on failure
    }
  }

  // Try ports in sequence
  let lastError: any = null;
  for (const port of ports) {
    try {
      const url = `http://127.0.0.1:${port}${endpoint}`;
      const res = await fetch(url, options);
      if (res.ok || res.status < 500) {
        cachedBaseUrl = `http://127.0.0.1:${port}`;
        return res;
      }
    } catch (err) {
      lastError = err;
    }
  }

  throw lastError || new Error("Could not connect to SIFense backend API on port 8000 or 8080.");
};
