import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api";
import Topbar from "../components/Topbar";
import { fmtIST } from "../utils/time";

type Row = { id: number; code: string; is_valid: boolean; created_at: string; ip: string | null; brand: string | null };
type Brand = { id: number; name: string };

export default function Activity() {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [brandId, setBrandId] = useState<string>("");
  const [valid, setValid] = useState<string>("");
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => { api.get("/api/brands").then((r) => setBrands(Array.isArray(r.data) ? r.data : (r.data?.items || []))).catch(() => {}); }, []);

  async function load() {
    setLoading(true);
    try {
      const params: any = { limit: 500 };
      if (brandId) params.brand_id = brandId;
      if (valid) params.valid = valid;
      const r = await api.get("/api/activity", { params });
      setRows(r.data);
    } finally { setLoading(false); }
  }
  useEffect(() => { load(); }, [brandId, valid]);

  const validCount = rows.filter((r) => r.is_valid).length;
  const invalidCount = rows.length - validCount;

  return (
    <>
      <Topbar />
      <div className="page">
        <Link to="/" className="back-link">← Back to Dashboard</Link>
        <h1 className="page-title">Verification Activity</h1>
        <p className="page-sub">All code verification attempts across brands</p>

        <div className="card" style={{ marginBottom: 16 }}>
          <div className="row" style={{ gap: 12, flexWrap: "wrap" }}>
            <div style={{ minWidth: 220 }}>
              <label className="label">Brand</label>
              <select className="select" value={brandId} onChange={(e) => setBrandId(e.target.value)}>
                <option value="">All brands</option>
                {brands.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </div>
            <div style={{ minWidth: 180 }}>
              <label className="label">Status</label>
              <select className="select" value={valid} onChange={(e) => setValid(e.target.value)}>
                <option value="">All</option>
                <option value="true">Valid only</option>
                <option value="false">Invalid only</option>
              </select>
            </div>
            <div className="spacer" />
            <div style={{ display: "flex", gap: 18, alignSelf: "flex-end" }}>
              <div><b style={{ color: "#1b5e20", fontSize: 18 }}>{validCount}</b> <span style={{ color: "#6b7280", fontSize: 12 }}>VALID</span></div>
              <div><b style={{ color: "#dc2626", fontSize: 18 }}>{invalidCount}</b> <span style={{ color: "#6b7280", fontSize: 12 }}>INVALID</span></div>
            </div>
          </div>
        </div>

        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          <div className="table-wrap">
          <table className="table" style={{ minWidth: 720 }}>
            <thead>
              <tr>
                <th>#</th><th>DATE / TIME</th><th>BRAND</th><th>CODE</th>
                <th>STATUS</th><th>IP</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={r.id}>
                  <td>{i + 1}</td>
                  <td>{fmtIST(r.created_at)}</td>
                  <td>{r.brand || "—"}</td>
                  <td><span className="code-pill">{r.code}</span></td>
                  <td>
                    {r.is_valid
                      ? <span className="badge-active">Valid</span>
                      : <span style={{ background: "#fee2e2", color: "#dc2626", padding: "4px 10px", borderRadius: 12, fontSize: 12, fontWeight: 600 }}>Invalid</span>}
                  </td>
                  <td style={{ color: "#6b7280", fontSize: 12 }}>{r.ip || "—"}</td>
                </tr>
              ))}
              {!rows.length && (
                <tr><td colSpan={6} style={{ textAlign: "center", color: "#9ca3af", padding: 32 }}>
                  {loading ? "Loading…" : "No verification activity yet"}
                </td></tr>
              )}
            </tbody>
          </table>
          </div>
        </div>
      </div>
    </>
  );
}
