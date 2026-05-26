import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { api } from "../api";

type Brand = {
  id: number; name: string; slug: string;
  primary_color: string; desktop_image: string | null; mobile_image: string | null;
};

type Result =
  | { status: "first"; brand: string; code: string; verified_at: string; history: string[] }
  | { status: "repeat"; brand: string; code: string; first_verified_at: string; current_scan_at: string; history: string[] }
  | { status: "invalid"; brand: string };

import { fmtIST } from "../utils/time";
function fmt(ts: string) { return fmtIST(ts); }

export default function Verify() {
  const { slug } = useParams();
  const [brand, setBrand] = useState<Brand | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [err, setErr] = useState("");

  useEffect(() => {
    function onResize() { setIsMobile(window.innerWidth < 768); }
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    api.get(`/api/public/brands/${slug}`)
      .then((r) => setBrand(r.data))
      .catch(() => setNotFound(true));
  }, [slug]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!code.trim() || !brand) return;
    setBusy(true); setErr(""); setResult(null);
    try {
      const r = await api.post("/api/public/verify", { slug, code: code.trim() });
      setResult(r.data);
    } catch (e: any) {
      setErr(e?.response?.data?.detail || "Verification failed");
    } finally { setBusy(false); }
  }

  if (notFound) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#0f172a", color: "#fff" }}>
        <div style={{ textAlign: "center" }}>
          <BrandMark color="#fff" accent="#34d399" />
          <h1 style={{ margin: "18px 0 6px" }}>Brand not found</h1>
          <p style={{ color: "#94a3b8" }}>This verification link is invalid or the brand is inactive.</p>
        </div>
      </div>
    );
  }
  if (!brand) {
    return <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>Loading…</div>;
  }

  const bg = (isMobile ? brand.mobile_image : brand.desktop_image) || brand.desktop_image || brand.mobile_image;
  const color = brand.primary_color || "#1b5e20";

  const pageBg = bg
    ? `linear-gradient(135deg, rgba(0,0,0,0.72) 0%, rgba(0,0,0,0.55) 100%), url(${bg}) center/cover no-repeat`
    : `linear-gradient(135deg, ${color} 0%, ${darken(color, 30)} 100%)`;

  return (
    <div style={{ minHeight: "100vh", background: pageBg, display: "flex", flexDirection: "column" }}>
      {/* Header */}
      <header style={{ padding: "20px 24px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <BrandMark color="#fff" accent="#86efac" />
        <div style={{ color: "rgba(255,255,255,0.85)", fontSize: 12, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase" }}>
          Authenticity Check
        </div>
      </header>

      {/* Hero + Card */}
      <main style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px 20px 40px" }}>
        <div style={{ width: "100%", maxWidth: 980, display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1.1fr 1fr", gap: 32, alignItems: "center" }}>
          {/* Left: hero */}
          {!isMobile && (
            <div style={{ color: "#fff" }}>
              <div style={{ display: "inline-block", padding: "6px 14px", background: "rgba(255,255,255,0.18)", backdropFilter: "blur(4px)", borderRadius: 999, fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" }}>
                Genuine {brand.name}
              </div>
              <h1 style={{ fontSize: 44, lineHeight: 1.1, margin: "18px 0 14px", fontWeight: 800, letterSpacing: "-0.02em" }}>
                Verify your<br />product is authentic
              </h1>
              <p style={{ fontSize: 16, lineHeight: 1.6, color: "rgba(255,255,255,0.85)", maxWidth: 440, margin: 0 }}>
                Enter the unique code printed on your {brand.name} packaging to instantly confirm it's the real thing —
                and to see if anyone has scanned it before.
              </p>
              <div style={{ display: "flex", gap: 28, marginTop: 28, color: "rgba(255,255,255,0.9)", fontSize: 13 }}>
                <Feat icon="shield" label="Tamper-proof" />
                <Feat icon="lock" label="Encrypted" />
                <Feat icon="clock" label="Instant result" />
              </div>
            </div>
          )}

          {/* Right: verify card */}
          <div style={{
            background: "#fff", borderRadius: 16, padding: 28,
            boxShadow: "0 25px 60px rgba(0,0,0,0.35)", border: "1px solid rgba(255,255,255,0.4)",
          }}>
            <div style={{ textAlign: "center", marginBottom: 22 }}>
              <div style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "6px 14px", background: color, color: "#fff", borderRadius: 999, fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                {brand.name}
              </div>
              <h2 style={{ margin: "14px 0 4px", fontSize: 22, color: "#111", fontWeight: 700 }}>Verify Authenticity</h2>
              <p style={{ margin: 0, color: "#6b7280", fontSize: 13 }}>Enter the code printed on your product</p>
            </div>

            <form onSubmit={submit}>
              <input
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="ENTER YOUR CODE"
                autoFocus
                style={{
                  width: "100%", padding: "16px 18px", fontSize: 17, fontFamily: "ui-monospace, Menlo, monospace",
                  border: `2px solid ${color}33`, borderRadius: 10, outline: "none", textAlign: "center",
                  letterSpacing: "0.08em", textTransform: "uppercase", background: "#fafafa",
                }}
                onFocus={(e) => (e.target.style.borderColor = color)}
                onBlur={(e) => (e.target.style.borderColor = `${color}33`)}
                required
              />
              <button
                type="submit"
                disabled={busy || !code.trim()}
                style={{
                  width: "100%", marginTop: 12, padding: "14px 16px", border: 0, borderRadius: 10,
                  background: color, color: "#fff", fontWeight: 700, fontSize: 16, cursor: busy ? "not-allowed" : "pointer",
                  opacity: busy ? 0.6 : 1, letterSpacing: "0.02em",
                  boxShadow: `0 6px 16px ${color}55`,
                }}
              >
                {busy ? "Verifying…" : "Verify Code →"}
              </button>
            </form>

            {err && <div style={{ marginTop: 14, color: "#dc2626", fontSize: 14, textAlign: "center" }}>{err}</div>}
            {result && <ResultBlock result={result} color={color} />}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer style={{ padding: "16px 24px", textAlign: "center", color: "rgba(255,255,255,0.7)", fontSize: 12 }}>
        Protected by <b style={{ color: "#fff" }}>PROverify</b> — trusted product authentication
      </footer>
    </div>
  );
}

function BrandMark({ color = "#fff", accent = "#86efac" }: { color?: string; accent?: string }) {
  return (
    <div style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
      <div style={{
        width: 32, height: 32, borderRadius: 8, background: "rgba(255,255,255,0.15)",
        display: "flex", alignItems: "center", justifyContent: "center", border: "1px solid rgba(255,255,255,0.25)",
      }}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={accent} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
          <polyline points="9 12 11 14 15 10"/>
        </svg>
      </div>
      <div style={{ fontSize: 20, fontWeight: 800, letterSpacing: "-0.02em", color }}>
        <span style={{ opacity: 0.92 }}>PRO</span><span style={{ color: accent }}>verify</span>
      </div>
    </div>
  );
}

function Feat({ icon, label }: { icon: "shield" | "lock" | "clock"; label: string }) {
  const paths: Record<string, JSX.Element> = {
    shield: <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>,
    lock: <><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></>,
    clock: <><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></>,
  };
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        {paths[icon]}
      </svg>
      <span>{label}</span>
    </div>
  );
}

function ResultBlock({ result, color }: { result: Result; color: string }) {
  if (result.status === "invalid") {
    return (
      <div style={{ marginTop: 20, padding: 18, background: "#fee2e2", border: "1px solid #fecaca", borderRadius: 10, textAlign: "center" }}>
        <div style={{ width: 48, height: 48, borderRadius: "50%", background: "#dc2626", color: "#fff", margin: "0 auto 8px",
                      display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28, fontWeight: 700 }}>✕</div>
        <div style={{ color: "#991b1b", fontWeight: 700, fontSize: 18 }}>Code Invalid</div>
        <div style={{ color: "#7f1d1d", fontSize: 13, marginTop: 6 }}>
          This code is not registered with {result.brand}. It may be counterfeit or mistyped.
        </div>
      </div>
    );
  }
  if (result.status === "first") {
    return (
      <div style={{ marginTop: 20, padding: 18, background: "#dcfce7", border: "1px solid #bbf7d0", borderRadius: 10, textAlign: "center" }}>
        <div style={{ width: 48, height: 48, borderRadius: "50%", background: color, color: "#fff", margin: "0 auto 8px",
                      display: "flex", alignItems: "center", justifyContent: "center" }}>
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
        </div>
        <div style={{ color: color, fontWeight: 700, fontSize: 18 }}>Authentic Product</div>
        <div style={{ color: "#166534", fontSize: 13, marginTop: 6 }}>Verified on {fmt(result.verified_at)}</div>
        <div style={{ color: "#166534", fontSize: 12, marginTop: 4 }}>This is the first time this code has been scanned.</div>
      </div>
    );
  }
  return (
    <div style={{ marginTop: 20, padding: 18, background: "#fef3c7", border: "1px solid #fde68a", borderRadius: 10 }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ width: 48, height: 48, borderRadius: "50%", background: "#b45309", color: "#fff", margin: "0 auto 8px",
                      display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26, fontWeight: 700 }}>!</div>
        <div style={{ color: "#92400e", fontWeight: 700, fontSize: 18 }}>Already Verified</div>
        <div style={{ color: "#92400e", fontSize: 13, marginTop: 6 }}>
          First verified on <b>{fmt(result.first_verified_at)}</b>
        </div>
        <div style={{ color: "#92400e", fontSize: 12, marginTop: 2 }}>
          Scanned just now: {fmt(result.current_scan_at)}
        </div>
      </div>
      <div style={{ marginTop: 14, paddingTop: 12, borderTop: "1px solid #fde68a" }}>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.05em", color: "#78350f", marginBottom: 6 }}>
          ALL PRIOR SCANS ({result.history.length})
        </div>
        <div style={{ maxHeight: 160, overflowY: "auto", fontSize: 12, color: "#78350f" }}>
          {result.history.map((t, i) => (
            <div key={i} style={{ padding: "4px 0", borderBottom: i < result.history.length - 1 ? "1px dashed #fde68a" : 0 }}>
              {i + 1}. {fmt(t)}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function darken(hex: string, pct: number) {
  const m = hex.replace("#", "");
  if (m.length !== 6) return hex;
  const r = Math.max(0, Math.round(parseInt(m.slice(0, 2), 16) * (1 - pct / 100)));
  const g = Math.max(0, Math.round(parseInt(m.slice(2, 4), 16) * (1 - pct / 100)));
  const b = Math.max(0, Math.round(parseInt(m.slice(4, 6), 16) * (1 - pct / 100)));
  return `#${[r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("")}`;
}
