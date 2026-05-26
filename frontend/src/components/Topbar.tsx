import { Link, useLocation } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import { getEmail, logout } from "../auth";

export default function Topbar() {
  const email = getEmail();
  const loc = useLocation();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const onUploads = loc.pathname.startsWith("/upload") || loc.pathname.startsWith("/batches");

  useEffect(() => { setOpen(false); }, [loc.pathname]);
  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  return (
    <div className="topbar">
      <Link to="/" className="brand-logo">
        <span className="pro">PRO</span><span className="verify">verify</span>
      </Link>
      <div className="row" style={{ gap: 18, fontSize: 14 }}>
        <Link to="/" className="btn-outline">Dashboard</Link>
        <Link to="/brands" className="btn-outline">Brands</Link>
        <div ref={ref} style={{ position: "relative" }}>
          <button
            type="button"
            className="btn-outline"
            onClick={() => setOpen((v) => !v)}
            style={{
              display: "inline-flex", alignItems: "center", gap: 6,
              background: onUploads ? "#e8f3ea" : undefined,
              borderColor: onUploads ? "#1b5e20" : undefined,
              color: onUploads ? "#1b5e20" : undefined,
              fontWeight: onUploads ? 600 : 500,
            }}
          >
            Uploads
            <span style={{ fontSize: 10, opacity: 0.7 }}>▾</span>
          </button>
          {open && (
            <div style={{
              position: "absolute", top: "calc(100% + 6px)", right: 0, minWidth: 220,
              background: "#fff", border: "1px solid #e5e7eb", borderRadius: 10,
              boxShadow: "0 12px 28px rgba(0,0,0,0.10)", padding: 6, zIndex: 50,
            }}>
              <MenuItem to="/upload" title="Upload New Codes" desc="Add a new .xlsx batch" icon="⬆" />
              <MenuItem to="/batches" title="Batch Uploads" desc="View, search, manage history" icon="📋" />
            </div>
          )}
        </div>
        <Link to="/activity" className="btn-outline">Activity</Link>
        <span style={{ color: "#374151" }}>{email || "--"}</span>
        <button className="btn-outline" style={{ color: "#dc2626" }} onClick={logout}>Logout</button>
      </div>
    </div>
  );
}

function MenuItem({ to, title, desc, icon }: { to: string; title: string; desc: string; icon: string }) {
  return (
    <Link
      to={to}
      style={{
        display: "flex", alignItems: "flex-start", gap: 10, padding: "10px 12px",
        borderRadius: 6, textDecoration: "none", color: "#111",
      }}
      onMouseEnter={(e) => (e.currentTarget.style.background = "#f3f4f6")}
      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
    >
      <span style={{
        width: 32, height: 32, borderRadius: 8, background: "#e8f3ea", color: "#1b5e20",
        display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 14, flexShrink: 0,
      }}>{icon}</span>
      <div>
        <div style={{ fontSize: 13, fontWeight: 600 }}>{title}</div>
        <div style={{ fontSize: 11, color: "#6b7280" }}>{desc}</div>
      </div>
    </Link>
  );
}
