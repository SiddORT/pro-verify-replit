import axios from "axios";

function resolveApiBase(): string {
  const env = (import.meta as any).env?.VITE_API_BASE as string | undefined;
  if (env) return env.replace(/\/$/, "");
  const { protocol, hostname, port } = window.location;
  // Replit dev domain: <id>-<port>.<region>.replit.dev  -> swap port subdomain
  if (/-\d+\./.test(hostname)) {
    return `${protocol}//${hostname.replace(/-\d+\./, "-8000.")}`;
  }
  // Localhost or other host: assume backend on :8000 on same host
  return `${protocol}//${hostname}:8000`;
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
