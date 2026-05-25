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

function fmt(ts: string) {
  return new Date(ts).toLocaleString();
}

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
    } finally {
      setBusy(false);
    }
  }

  if (notFound) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#111", color: "#fff" }}>
        <div style={{ textAlign: "center" }}>
          <h1 style={{ margin: 0 }}>Brand not found</h1>
          <p style={{ color: "#9ca3af" }}>This verification link is invalid or the brand is inactive.</p>
        </div>
      </div>
    );
  }
  if (!brand) {
    return <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>Loading…</div>;
  }

  const bg = (isMobile ? brand.mobile_image : brand.desktop_image) || brand.desktop_image || brand.mobile_image;
  const color = brand.primary_color || "#1b5e20";

  return (
    <div
      style={{
        minHeight: "100vh",
        background: bg ? `linear-gradient(rgba(0,0,0,0.55), rgba(0,0,0,0.55)), url(${bg}) center/cover no-repeat` : color,
        display: "flex", alignItems: "center", justifyContent: "center", padding: 20,
      }}
    >
      <div style={{ width: "100%", maxWidth: 460, background: "rgba(255,255,255,0.97)", borderRadius: 14, padding: 32, boxShadow: "0 20px 50px rgba(0,0,0,0.3)" }}>
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <div style={{ display: "inline-block", padding: "6px 14px", background: color, color: "#fff", borderRadius: 20, fontSize: 12, fontWeight: 700, letterSpacing: "0.05em", textTransform: "uppercase" }}>
            {brand.name}
          </div>
          <h1 style={{ margin: "16px 0 6px", fontSize: 24, color: "#111" }}>Verify Authenticity</h1>
          <p style={{ margin: 0, color: "#6b7280", fontSize: 14 }}>Enter the unique code printed on your product</p>
        </div>

        <form onSubmit={submit}>
          <input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="Enter your code"
            autoFocus
            style={{
              width: "100%", padding: "14px 16px", fontSize: 16, fontFamily: "ui-monospace, Menlo, monospace",
              border: `2px solid ${color}33`, borderRadius: 8, outline: "none", textAlign: "center", letterSpacing: "0.05em",
              textTransform: "uppercase",
            }}
            required
          />
          <button
            type="submit"
            disabled={busy || !code.trim()}
            style={{
              width: "100%", marginTop: 12, padding: "14px 16px", border: 0, borderRadius: 8,
              background: color, color: "#fff", fontWeight: 700, fontSize: 16, cursor: busy ? "not-allowed" : "pointer",
              opacity: busy ? 0.6 : 1,
            }}
          >
            {busy ? "Verifying…" : "Verify Code"}
          </button>
        </form>

        {err && <div style={{ marginTop: 14, color: "#dc2626", fontSize: 14, textAlign: "center" }}>{err}</div>}

        {result && <ResultBlock result={result} color={color} />}
      </div>
    </div>
  );
}

function ResultBlock({ result, color }: { result: Result; color: string }) {
  if (result.status === "invalid") {
    return (
      <div style={{ marginTop: 20, padding: 18, background: "#fee2e2", border: "1px solid #fecaca", borderRadius: 10, textAlign: "center" }}>
        <div style={{ fontSize: 36, marginBottom: 4 }}>✕</div>
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
        <div style={{ fontSize: 36, marginBottom: 4, color: color }}>✓</div>
        <div style={{ color: color, fontWeight: 700, fontSize: 18 }}>Authentic Product</div>
        <div style={{ color: "#166534", fontSize: 13, marginTop: 6 }}>Verified on {fmt(result.verified_at)}</div>
        <div style={{ color: "#166534", fontSize: 12, marginTop: 4 }}>This is the first time this code has been verified.</div>
      </div>
    );
  }
  return (
    <div style={{ marginTop: 20, padding: 18, background: "#fef3c7", border: "1px solid #fde68a", borderRadius: 10 }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: 32, marginBottom: 4, color: "#b45309" }}>!</div>
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
