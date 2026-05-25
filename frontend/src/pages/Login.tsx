import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api";

export default function Login() {
  const nav = useNavigate();
  const [email, setEmail] = useState("admin@proverify.com");
  const [password, setPassword] = useState("admin123");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

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
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", minHeight: "100vh" }}>
      <div style={{
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
        <div style={{ display: "flex", gap: 60, marginTop: 36 }}>
          <Stat n="30" l="Codes Protected" />
          <Stat n="4" l="Scans Completed" />
          <Stat n="99.9%" l="Uptime" />
        </div>
      </div>
      <div style={{ background: "#fff", display: "flex", alignItems: "center", justifyContent: "center", padding: 40 }}>
        <form onSubmit={submit} style={{ width: 380 }}>
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
            <input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
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
