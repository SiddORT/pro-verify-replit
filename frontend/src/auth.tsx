import { Navigate, useLocation } from "react-router-dom";

export function isAuthed() {
  return !!localStorage.getItem("pv_token");
}

export function RequireAuth({ children }: { children: JSX.Element }) {
  const loc = useLocation();
  if (!isAuthed()) return <Navigate to="/login" state={{ from: loc }} replace />;
  return children;
}

export function getEmail() {
  return localStorage.getItem("pv_email") || "";
}

export function logout() {
  localStorage.removeItem("pv_token");
  localStorage.removeItem("pv_email");
  window.location.href = "/login";
}
