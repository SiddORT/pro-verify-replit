import { Link, useLocation } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import { getEmail, logout } from "../auth";

export default function Topbar() {
  const email = getEmail();
  const loc = useLocation();
  const [open, setOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const onUploads = loc.pathname.startsWith("/upload") || loc.pathname.startsWith("/batches");

  useEffect(() => { setOpen(false); setMobileOpen(false); }, [loc.pathname]);
  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  return (
    <div className="topbar">
      <Link to="/" className="brand-logo" style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
        <span style={{
          width: 30, height: 30, borderRadius: 7, background: "#1b5e20",
          display: "inline-flex", alignItems: "center", justifyContent: "center",
          boxShadow: "0 2px 6px rgba(27,94,32,0.25)", flexShrink: 0,
        }}>
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#86efac" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
            <polyline points="9 12 11 14 15 10"/>
          </svg>
        </span>
        <span><span className="pro">PRO</span><span className="verify">verify</span></span>
      </Link>

      {/* Desktop nav */}
      <div className="topbar-nav is-desktop">
        <NavLink to="/" label="Dashboard" active={loc.pathname === "/"} />
        <NavLink to="/brands" label="Brands" active={loc.pathname.startsWith("/brands")} />
        <div ref={ref} style={{ position: "relative" }}>
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            style={{
              display: "inline-flex", alignItems: "center", gap: 6,
              padding: "7px 12px", borderRadius: 8, cursor: "pointer",
              border: "1px solid " + (onUploads ? "#1b5e20" : "transparent"),
              background: onUploads ? "#e8f3ea" : "transparent",
              color: onUploads ? "#1b5e20" : "#374151",
              fontWeight: onUploads ? 600 : 500, fontSize: 14,
            }}
            onMouseEnter={(e) => { if (!onUploads) e.currentTarget.style.background = "#f3f4f6"; }}
            onMouseLeave={(e) => { if (!onUploads) e.currentTarget.style.background = "transparent"; }}
          >
            Uploads
            <span style={{
              fontSize: 10, transition: "transform 0.15s",
              transform: open ? "rotate(180deg)" : "rotate(0)",
            }}>▾</span>
          </button>
          {open && (
            <div style={{
              position: "absolute", top: "calc(100% + 8px)", right: 0, minWidth: 260,
              background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12,
              boxShadow: "0 16px 36px rgba(0,0,0,0.12)", padding: 8, zIndex: 50,
            }}>
              <MenuItem to="/upload" title="Upload New Codes" desc="Add a fresh .xlsx batch" icon={UploadIcon} active={loc.pathname === "/upload"} />
              <MenuItem to="/batches" title="Batch Uploads" desc="Browse, search & manage history" icon={ListIcon} active={loc.pathname.startsWith("/batches")} />
            </div>
          )}
        </div>
        <NavLink to="/activity" label="Activity" active={loc.pathname.startsWith("/activity")} />
        <div style={{ width: 1, height: 22, background: "#e5e7eb", margin: "0 6px" }} />
        <span style={{ color: "#374151", fontSize: 13 }}>{email || "--"}</span>
        <button className="btn-outline" style={{ color: "#dc2626" }} onClick={logout}>Logout</button>
      </div>

      {/* Mobile burger */}
      <button
        type="button"
        className="topbar-burger"
        aria-label={mobileOpen ? "Close menu" : "Open menu"}
        onClick={() => setMobileOpen((v) => !v)}
      >
        {mobileOpen ? (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="6" y1="6" x2="18" y2="18"/><line x1="6" y1="18" x2="18" y2="6"/>
          </svg>
        ) : (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>
          </svg>
        )}
      </button>

      {/* Mobile dropdown panel */}
      {mobileOpen && (
        <div className="topbar-mobile-panel">
          <MobileLink to="/" label="Dashboard" active={loc.pathname === "/"} />
          <MobileLink to="/brands" label="Brands" active={loc.pathname.startsWith("/brands")} />
          <MobileLink to="/upload" label="Upload New Codes" active={loc.pathname === "/upload"} />
          <MobileLink to="/batches" label="Batch Uploads" active={loc.pathname.startsWith("/batches")} />
          <MobileLink to="/activity" label="Activity" active={loc.pathname.startsWith("/activity")} />
          <div style={{ borderTop: "1px solid #f1f2f4", margin: "8px 0", paddingTop: 8 }}>
            <div style={{ padding: "6px 12px", fontSize: 12, color: "#6b7280" }}>{email || "--"}</div>
            <button
              onClick={logout}
              style={{
                width: "100%", textAlign: "left", padding: "10px 12px", borderRadius: 8,
                border: 0, background: "transparent", color: "#dc2626", fontSize: 14, fontWeight: 600,
              }}
            >Logout</button>
          </div>
        </div>
      )}
    </div>
  );
}

function MobileLink({ to, label, active }: { to: string; label: string; active: boolean }) {
  return (
    <Link
      to={to}
      style={{
        display: "block", padding: "10px 12px", borderRadius: 8, fontSize: 15,
        color: active ? "#1b5e20" : "#111",
        background: active ? "#e8f3ea" : "transparent",
        fontWeight: active ? 600 : 500,
      }}
    >{label}</Link>
  );
}

function NavLink({ to, label, active }: { to: string; label: string; active: boolean }) {
  return (
    <Link
      to={to}
      style={{
        padding: "7px 12px", borderRadius: 8, textDecoration: "none", fontSize: 14,
        border: "1px solid " + (active ? "#1b5e20" : "transparent"),
        background: active ? "#e8f3ea" : "transparent",
        color: active ? "#1b5e20" : "#374151",
        fontWeight: active ? 600 : 500,
      }}
      onMouseEnter={(e) => { if (!active) e.currentTarget.style.background = "#f3f4f6"; }}
      onMouseLeave={(e) => { if (!active) e.currentTarget.style.background = "transparent"; }}
    >{label}</Link>
  );
}

function MenuItem({ to, title, desc, icon: Icon, active }: { to: string; title: string; desc: string; icon: () => JSX.Element; active: boolean }) {
  return (
    <Link
      to={to}
      style={{
        display: "flex", alignItems: "flex-start", gap: 12, padding: "10px 12px",
        borderRadius: 8, textDecoration: "none", color: "#111",
        background: active ? "#f0fdf4" : "transparent",
      }}
      onMouseEnter={(e) => (e.currentTarget.style.background = active ? "#dcfce7" : "#f9fafb")}
      onMouseLeave={(e) => (e.currentTarget.style.background = active ? "#f0fdf4" : "transparent")}
    >
      <span style={{
        width: 36, height: 36, borderRadius: 8,
        background: active ? "#1b5e20" : "#e8f3ea",
        color: active ? "#fff" : "#1b5e20",
        display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
      }}><Icon /></span>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: "#111", display: "flex", alignItems: "center", gap: 6 }}>
          {title}
          {active && <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#1b5e20" }} />}
        </div>
        <div style={{ fontSize: 11, color: "#6b7280", marginTop: 2 }}>{desc}</div>
      </div>
    </Link>
  );
}

function UploadIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
      <polyline points="17 8 12 3 7 8"/>
      <line x1="12" y1="3" x2="12" y2="15"/>
    </svg>
  );
}
function ListIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="8" y1="6" x2="21" y2="6"/>
      <line x1="8" y1="12" x2="21" y2="12"/>
      <line x1="8" y1="18" x2="21" y2="18"/>
      <line x1="3" y1="6" x2="3.01" y2="6"/>
      <line x1="3" y1="12" x2="3.01" y2="12"/>
      <line x1="3" y1="18" x2="3.01" y2="18"/>
    </svg>
  );
}
