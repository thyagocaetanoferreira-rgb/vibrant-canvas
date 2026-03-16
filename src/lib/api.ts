const BASE_URL = import.meta.env.VITE_API_URL || "/api";

function getToken(): string | null {
  return localStorage.getItem("vh_token");
}

async function request<T>(
  method: string,
  path: string,
  body?: unknown,
  headers?: Record<string, string>
): Promise<T> {
  const token = getToken();
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(err.message || res.statusText);
  }

  const text = await res.text();
  return text ? JSON.parse(text) : (undefined as T);
}

export const api = {
  get: <T>(path: string) => request<T>("GET", path),
  post: <T>(path: string, body?: unknown) => request<T>("POST", path, body),
  put: <T>(path: string, body?: unknown) => request<T>("PUT", path, body),
  patch: <T>(path: string, body?: unknown) => request<T>("PATCH", path, body),
  delete: <T>(path: string) => request<T>("DELETE", path),

  async uploadFoto(file: File): Promise<{ url: string }> {
    const token = getToken();
    const form = new FormData();
    form.append("foto", file);
    const res = await fetch(`${BASE_URL}/upload/foto`, {
      method: "POST",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: form,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: res.statusText }));
      throw new Error(err.message || res.statusText);
    }
    return res.json();
  },
};

export function setToken(token: string) {
  localStorage.setItem("vh_token", token);
}

export function clearToken() {
  localStorage.removeItem("vh_token");
}
