import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api, apiBase } from "../api";
import Topbar from "../components/Topbar";

export default function Upload() {
  const nav = useNavigate();
  const [brands, setBrands] = useState<any[]>([]);
  const [brandId, setBrandId] = useState<string>("");
  const [file, setFile] = useState<File | null>(null);
  const [drag, setDrag] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const fRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    api.get("/api/brands?active_only=true").then((r) => setBrands(r.data));
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    if (!brandId) return setMsg({ ok: false, text: "Please select a brand" });
    if (!file) return setMsg({ ok: false, text: "Please choose an .xlsx file" });
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("brand_id", brandId);
      fd.append("file", file);
      const r = await api.post("/api/codes/upload", fd, { headers: { "Content-Type": "multipart/form-data" } });
      setMsg({ ok: true, text: `Uploaded ${r.data.codes_uploaded} codes — batch ${r.data.batch_number}` });
      setFile(null); if (fRef.current) fRef.current.value = "";
      setTimeout(() => nav("/"), 1500);
    } catch (e: any) {
      setMsg({ ok: false, text: e?.response?.data?.detail || "Upload failed" });
    } finally { setUploading(false); }
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault(); setDrag(false);
    const f = e.dataTransfer.files?.[0];
    if (f) setFile(f);
  }

  async function downloadSample() {
    const token = localStorage.getItem("pv_token");
    const res = await fetch(`${apiBase}/api/codes/sample`, { headers: { Authorization: `Bearer ${token}` } });
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "sample_codes.xlsx"; a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <>
      <Topbar />
      <div className="page" style={{ maxWidth: 880 }}>
        <Link to="/" className="back-link">← Back to Dashboard</Link>
        <h1 className="page-title">Upload New Codes</h1>
        <p className="page-sub">Upload an Excel file with codes mapped to a brand</p>

        <form onSubmit={submit} className="card">
          <h3 style={{ margin: "0 0 18px", fontSize: 16 }}>Code Upload</h3>
          <div style={{ marginBottom: 18 }}>
            <label className="label">Select Brand</label>
            <select className="select" value={brandId} onChange={(e) => setBrandId(e.target.value)} required>
              <option value="">{brands.length ? "Choose a brand..." : "Loading brands..."}</option>
              {brands.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
            <div style={{ color: "#6b7280", fontSize: 12, marginTop: 6 }}>
              Only active brands from the Brand Master are shown here.
            </div>
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <label className="label" style={{ margin: 0 }}>Upload Excel File (.xlsx)</label>
            <button type="button" className="btn-outline" onClick={downloadSample}>↓ Download Sample</button>
          </div>

          <div
            className={`dropzone ${drag ? "drag" : ""}`}
            onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
            onDragLeave={() => setDrag(false)}
            onDrop={onDrop}
            onClick={() => fRef.current?.click()}
          >
            <div className="dropzone-icon">⬆</div>
            {file ? (
              <div style={{ marginTop: 10, fontWeight: 600 }}>{file.name} <span style={{ color: "#6b7280", fontWeight: 400 }}>({(file.size / 1024).toFixed(1)} KB)</span></div>
            ) : (
              <>
                <div style={{ marginTop: 10 }}>Drag & drop your Excel file here, or click to browse</div>
                <div style={{ color: "#9ca3af", fontSize: 12, marginTop: 4 }}>Accepts .xlsx files. Must have a "Code" column.</div>
              </>
            )}
            <input ref={fRef} type="file" accept=".xlsx" hidden onChange={(e) => setFile(e.target.files?.[0] || null)} />
          </div>

          {msg && (
            <div style={{ marginTop: 14, padding: 10, borderRadius: 6,
              background: msg.ok ? "#e8f3ea" : "#fee2e2", color: msg.ok ? "#1b5e20" : "#991b1b", fontSize: 14 }}>
              {msg.text}
            </div>
          )}

          <div style={{ marginTop: 18 }}>
            <button className="btn" type="submit" disabled={uploading}>
              {uploading ? "Uploading..." : "Upload Codes"}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}
