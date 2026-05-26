import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api";

export default function Login() {
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<{ codes: number; verifications: number; uptime: string } | null>(null);

  useEffect(() => {
    api.get("/api/public/stats").then((r) => setStats(r.data)).catch(() => {});
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(""); setLoading(true);
    try {
      const r = await api.post("/api/auth/login", { email, password });
      localStorage.setItem("pv_token", r.data.access_token);
      localStorage.setItem("pv_email", r.data.email);
      nav("/");
    } catch (e: any) {
      setErr(e?.response?.data?.detail || "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-grid" style={{ minHeight: "100vh" }}>
      <div className="login-hero" style={{
        background: "linear-gradient(135deg, #1b5e20 0%, #2e7d32 100%)",
        color: "#fff", padding: "80px 60px", display: "flex", flexDirection: "column", justifyContent: "center"
      }}>
        <div style={{ fontSize: 44, fontWeight: 800, letterSpacing: "-0.02em", marginBottom: 24 }}>
          <span style={{ color: "#fff" }}>PRO</span><span style={{ color: "#a5d6a7" }}>verify</span>
        </div>
        <h1 style={{ fontSize: 38, lineHeight: 1.15, margin: "0 0 18px", fontWeight: 700 }}>
          Protect Your Brand. Empower<br/>Your Customers.
        </h1>
        <p style={{ color: "#c8e6c9", fontSize: 15, lineHeight: 1.6, maxWidth: 480 }}>
          The trusted product authentication platform for protein supplement manufacturers.
          Verify authenticity, track scans, and fight counterfeiting -- all from one dashboard.
        </p>
        <div style={{ display: "flex", gap: 40, marginTop: 36, flexWrap: "wrap" }}>
          <Stat n={stats ? stats.codes.toLocaleString() : "—"} l="Codes Protected" />
          <Stat n={stats ? stats.verifications.toLocaleString() : "—"} l="Scans Completed" />
          <Stat n={stats ? stats.uptime : "—"} l="Uptime" />
        </div>
      </div>
      <div style={{ background: "#fff", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
        <form onSubmit={submit} style={{ width: "100%", maxWidth: 380 }}>
          <div style={{ textAlign: "center", marginBottom: 28 }}>
            <div style={{ fontSize: 32, fontWeight: 800, letterSpacing: "-0.02em" }}>
              <span style={{ color: "#1b5e20" }}>PRO</span><span style={{ color: "#4caf50" }}>verify</span>
            </div>
            <h2 style={{ fontSize: 18, fontWeight: 700, margin: "16px 0 6px" }}>Admin Login</h2>
            <div style={{ color: "#6b7280", fontSize: 13 }}>Sign in to access the admin dashboard</div>
          </div>
          <div style={{ marginBottom: 14 }}>
            <label className="label">Email Address</label>
            <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div style={{ marginBottom: 18 }}>
            <label className="label">Password</label>
            <div style={{ position: "relative" }}>
              <input
                className="input"
                type={showPw ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                style={{ paddingRight: 40 }}
              />
              <button
                type="button"
                onClick={() => setShowPw((s) => !s)}
                aria-label={showPw ? "Hide password" : "Show password"}
                style={{
                  position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)",
                  background: "transparent", border: 0, color: "#6b7280", padding: 6, cursor: "pointer",
                  display: "flex", alignItems: "center",
                }}
              >
                {showPw ? (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
                    <line x1="1" y1="1" x2="23" y2="23"/>
                  </svg>
                ) : (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                    <circle cx="12" cy="12" r="3"/>
                  </svg>
                )}
              </button>
            </div>
          </div>
          {err && <div style={{ color: "#dc2626", fontSize: 13, marginBottom: 12 }}>{err}</div>}
          <button className="btn" type="submit" disabled={loading} style={{ width: "100%", padding: 12 }}>
            {loading ? "Signing in..." : "Sign In"}
          </button>
          <div style={{ textAlign: "center", color: "#9ca3af", fontSize: 12, marginTop: 16 }}>
            Authorized personnel only. Contact support for access.
          </div>
        </form>
      </div>
    </div>
  );
}

function Stat({ n, l }: { n: string; l: string }) {
  return (
    <div>
      <div style={{ fontSize: 28, fontWeight: 700 }}>{n}</div>
      <div style={{ fontSize: 11, color: "#c8e6c9", letterSpacing: "0.06em", marginTop: 4 }}>{l.toUpperCase()}</div>
    </div>
  );
}
