import axios from "axios";

function resolveApiBase(): string {
  const env = (import.meta as any).env?.VITE_API_BASE as string | undefined;
  if (env) return env.replace(/\/$/, "");
  const { protocol, hostname } = window.location;
  // Replit dev domain: <id>-<port>.<region>.replit.dev  -> swap port subdomain
  // so the Vite frontend on :5000 can reach the uvicorn backend on :8000.
  if (/-\d+\./.test(hostname)) {
    return `${protocol}//${hostname.replace(/-\d+\./, "-8000.")}`;
  }
  // Localhost dev: backend on :8000 on the same host.
  if (hostname === "localhost" || hostname === "127.0.0.1") {
    return `${protocol}//${hostname}:8000`;
  }
  // Production (.replit.app or custom domain): FastAPI serves both API
  // and the built frontend on the same origin, so use relative URLs.
  return "";
}

const API_BASE = resolveApiBase();

export const api = axios.create({
  baseURL: API_BASE,
});

api.interceptors.request.use((cfg) => {
  const token = localStorage.getItem("pv_token");
  if (token) cfg.headers.Authorization = `Bearer ${token}`;
  return cfg;
});

api.interceptors.response.use(
  (r) => r,
  (err) => {
    if (err?.response?.status === 401 && window.location.pathname !== "/login") {
      localStorage.removeItem("pv_token");
      localStorage.removeItem("pv_email");
      window.location.href = "/login";
    }
    return Promise.reject(err);
  }
);

export const apiBase = API_BASE;

// Resolve an image/asset URL returned by the backend (e.g. "/uploads/brands/xx.png")
// into a fully-qualified URL the browser can load. Pass through absolute URLs
// (data:, http(s):, blob:) unchanged.
export function assetUrl(u: string | null | undefined): string {
  if (!u) return "";
  if (/^(data:|blob:|https?:\/\/)/i.test(u)) return u;
  if (u.startsWith("/")) return `${API_BASE}${u}`;
  return u;
}
